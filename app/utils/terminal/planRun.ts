import { expandEnv, parseCommandLine, splitOutputRedirect } from '~/utils/terminal/pipeline'
import { expandHistory } from '~/utils/terminal/history'

// The pure front half of the terminal's run(): history + env expansion, output
// redirection, alias-aware command parsing, and the `| copy` sink. Returns a
// plan the composable can act on, or an error to print. No side effects — so it
// is unit-testable without a terminal.

export interface RunPlan {
  /** The line to record in history + echo when expansion changed it */
  commandLine: string
  /** Whether history expansion rewrote the input (echo it) */
  expanded: boolean
  name: string
  args: string[]
  /** Pipe filter stages (grep/head/…), excluding a trailing `copy`/`less` */
  pipeStages: string[]
  /** True when the final pipe stage was `copy` (send to clipboard) */
  toClipboard: boolean
  /** True when the final pipe stage was `less`/`more` (page the output) */
  toPager: boolean
  /** Redirect target file, or null */
  redirectFile: string | null
  append: boolean
}

export function planRun(
  input: string,
  ctx: { aliases: Record<string, string>, env: Record<string, string>, history: string[] }
): { error: string } | RunPlan {
  const expansion = expandHistory(input, ctx.history)
  if ('error' in expansion) return { error: expansion.error }

  const commandLine = expansion.expanded
  const withEnv = expandEnv(commandLine, ctx.env)
  const { command: cmdLine, file: redirectFile, append } = splitOutputRedirect(withEnv)
  const { name, args, pipeStages } = parseCommandLine(cmdLine, ctx.aliases)

  const last = pipeStages.at(-1)?.trim()
  const toClipboard = last === 'copy'
  const toPager = last === 'less' || last === 'more'
  return {
    commandLine,
    expanded: expansion.changed,
    name,
    args,
    pipeStages: toClipboard || toPager ? pipeStages.slice(0, -1) : pipeStages,
    toClipboard,
    toPager,
    redirectFile,
    append
  }
}
