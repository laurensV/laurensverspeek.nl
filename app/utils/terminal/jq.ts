// A small, real subset of jq for the terminal. Enough to poke around the
// site's own JSON (resume, profile, projects) or anything piped in from `curl`
// / `cat`. Supported grammar:
//   .                        identity
//   .foo   .foo.bar          field access (also .["a b"] and ["a b"])
//   .foo[0]  .foo[-1]        array index (negative counts from the end)
//   .foo[]   .[]             iterate an array or object's values (a stream)
//   f | g                    pipe one filter's output into the next
//   length keys values type  builtins
//   trailing ? on an access  suppress the "cannot index" error → nothing
// Missing object keys yield null (as in jq); indexing the wrong type errors.

type JsonValue = unknown

interface Access {
  kind: 'field' | 'index' | 'iterate'
  key?: string
  index?: number
  optional?: boolean
}

class JqError extends Error {}

// split "a | b | c" on top-level pipes only (not inside [] or quotes)
function splitPipes(filter: string): string[] {
  const parts: string[] = []
  let depth = 0
  let quote: string | null = null
  let current = ''
  for (const ch of filter) {
    if (quote) {
      current += ch
      if (ch === quote) quote = null
      continue
    }
    if (ch === '"' || ch === '\'') { quote = ch; current += ch; continue }
    if (ch === '[') depth++
    else if (ch === ']') depth--
    if (ch === '|' && depth === 0) { parts.push(current); current = ''; continue }
    current += ch
  }
  parts.push(current)
  return parts.map((p) => p.trim()).filter((p) => p.length > 0)
}

const BUILTINS = new Set(['length', 'keys', 'values', 'type'])

// parse one stage (already pipe-split) into either a builtin name or a path
function parseStage(stage: string): { builtin: string } | { access: Access[] } {
  const trimmed = stage.trim()
  if (BUILTINS.has(trimmed)) return { builtin: trimmed }
  if (trimmed === '.') return { access: [] }

  const access: Access[] = []
  let rest = trimmed
  const optionalTail = () => {
    if (rest.startsWith('?')) { rest = rest.slice(1); if (access.length) access[access.length - 1]!.optional = true }
  }
  // a leading dot is required for a path, but `["x"]` / `[0]` may follow bare
  if (rest.startsWith('.')) rest = rest.slice(1)
  else if (!rest.startsWith('[')) throw new JqError(`jq: unknown filter '${stage.trim()}'`)

  // an identity leading dot with only ? etc.
  while (rest.length > 0) {
    let m: RegExpMatchArray | null
    if ((m = rest.match(/^\.?"([^"]*)"/)) || (m = rest.match(/^\.?([A-Za-z_][A-Za-z0-9_]*)/))) {
      // .foo or ."a b" (the leading dot is optional after the first segment)
      access.push({ kind: 'field', key: m[1] })
      rest = rest.slice(m[0].length)
      optionalTail()
      continue
    }
    if ((m = rest.match(/^\[\s*"([^"]*)"\s*\]/))) {
      access.push({ kind: 'field', key: m[1] })
      rest = rest.slice(m[0].length)
      optionalTail()
      continue
    }
    if ((m = rest.match(/^\[\s*(-?\d+)\s*\]/))) {
      access.push({ kind: 'index', index: Number(m[1]) })
      rest = rest.slice(m[0].length)
      optionalTail()
      continue
    }
    if (rest.startsWith('[]')) {
      access.push({ kind: 'iterate' })
      rest = rest.slice(2)
      optionalTail()
      continue
    }
    throw new JqError(`jq: could not parse '${stage.trim()}' near '${rest}'`)
  }
  return { access }
}

const typeOf = (value: JsonValue): string =>
  value === null ? 'null'
    : Array.isArray(value) ? 'array'
      : typeof value === 'object' ? 'object'
        : typeof value // 'string' | 'number' | 'boolean'

function applyBuiltin(name: string, value: JsonValue): JsonValue {
  switch (name) {
    case 'type': return typeOf(value)
    case 'length':
      if (value === null) return 0
      if (typeof value === 'string' || Array.isArray(value)) return value.length
      if (typeof value === 'object') return Object.keys(value).length
      throw new JqError(`jq: ${typeOf(value)} (${JSON.stringify(value)}) has no length`)
    case 'keys':
      if (Array.isArray(value)) return value.map((_, i) => i)
      if (value && typeof value === 'object') return Object.keys(value).sort()
      throw new JqError(`jq: ${typeOf(value)} has no keys`)
    case 'values':
      if (Array.isArray(value)) return value
      if (value && typeof value === 'object') return Object.values(value)
      throw new JqError(`jq: ${typeOf(value)} has no values`)
    default:
      throw new JqError(`jq: unknown builtin '${name}'`)
  }
}

// evaluate a path stage against one value, returning a STREAM (iterate fans out)
function applyAccess(access: Access[], input: JsonValue): JsonValue[] {
  let stream: JsonValue[] = [input]
  for (const op of access) {
    const next: JsonValue[] = []
    for (const value of stream) {
      if (op.kind === 'field') {
        if (value === null) { next.push(null); continue }
        if (typeof value !== 'object' || Array.isArray(value)) {
          if (op.optional) continue
          throw new JqError(`jq: cannot index ${typeOf(value)} with "${op.key}"`)
        }
        next.push((value as Record<string, JsonValue>)[op.key!] ?? null)
      } else if (op.kind === 'index') {
        if (value === null) { next.push(null); continue }
        if (!Array.isArray(value)) {
          if (op.optional) continue
          throw new JqError(`jq: cannot index ${typeOf(value)} with a number`)
        }
        const i = op.index! < 0 ? value.length + op.index! : op.index!
        next.push(value[i] ?? null)
      } else { // iterate
        if (Array.isArray(value)) next.push(...value)
        else if (value && typeof value === 'object') next.push(...Object.values(value))
        else if (!op.optional) throw new JqError(`jq: cannot iterate over ${typeOf(value)}`)
      }
    }
    stream = next
  }
  return stream
}

/** Run a jq filter against parsed data, returning the output stream. Throws JqError. */
export function jqStream(filter: string, data: JsonValue): JsonValue[] {
  const stages = splitPipes(filter)
  if (stages.length === 0) return [data]
  let stream: JsonValue[] = [data]
  for (const stage of stages) {
    const parsed = parseStage(stage)
    const next: JsonValue[] = []
    for (const value of stream) {
      if ('builtin' in parsed) next.push(applyBuiltin(parsed.builtin, value))
      else next.push(...applyAccess(parsed.access, value))
    }
    stream = next
  }
  return stream
}

/**
 * Run jq over a JSON string. Returns pretty-printed output lines, or an error.
 * Used by both the `jq` command and the `| jq` pipe filter.
 */
export function runJq(filter: string, json: string): { ok: true, lines: string[] } | { ok: false, error: string } {
  let data: JsonValue
  try {
    data = JSON.parse(json)
  } catch {
    return { ok: false, error: 'jq: input is not valid JSON' }
  }
  try {
    const results = jqStream(filter || '.', data)
    const lines = results.flatMap((value) => JSON.stringify(value, null, 2).split('\n'))
    return { ok: true, lines }
  } catch (err) {
    return { ok: false, error: err instanceof JqError ? err.message : `jq: ${String(err)}` }
  }
}
