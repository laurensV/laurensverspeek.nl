// Real editors inside the terminal: nano (friendly) and vim (modal), both
// running as GameHandles over a shared text-buffer core. They edit files in
// the persistent home filesystem via the EditorIO the command wires up.

import type { GameHandle, GameCallbacks } from '~/utils/terminalGames'

export interface EditorIO {
  filename: string
  read: () => string
  /** Persist the buffer; false when the write failed */
  write: (content: string) => boolean
}

const VIEW_ROWS = 13
const VIEW_COLS = 56

interface Buffer {
  lines: string[]
  row: number
  col: number
  dirty: boolean
  top: number
}

const makeBuffer = (content: string): Buffer => ({
  lines: content ? content.split('\n') : [''],
  row: 0,
  col: 0,
  dirty: false,
  top: 0
})

const clampCol = (buffer: Buffer, allowPastEnd = true) => {
  const max = buffer.lines[buffer.row]!.length - (allowPastEnd ? 0 : 1)
  buffer.col = Math.max(0, Math.min(buffer.col, Math.max(0, max)))
}

const scrollIntoView = (buffer: Buffer) => {
  if (buffer.row < buffer.top) buffer.top = buffer.row
  if (buffer.row >= buffer.top + VIEW_ROWS) buffer.top = buffer.row - VIEW_ROWS + 1
}

/** The visible buffer rows, with a block cursor drawn in. */
const renderRows = (buffer: Buffer): string[] => {
  scrollIntoView(buffer)
  const rows: string[] = []
  for (let i = buffer.top; i < buffer.top + VIEW_ROWS; i++) {
    const line = buffer.lines[i]
    if (line === undefined) {
      rows.push('~')
      continue
    }
    let text = line.length > VIEW_COLS ? line.slice(0, VIEW_COLS - 1) + '…' : line
    if (i === buffer.row) {
      const col = Math.min(buffer.col, VIEW_COLS - 1)
      text = `${text.slice(0, col)}█${text.slice(col + 1)}`
    }
    rows.push(text)
  }
  return rows
}

const insertChar = (buffer: Buffer, ch: string) => {
  const line = buffer.lines[buffer.row]!
  buffer.lines[buffer.row] = line.slice(0, buffer.col) + ch + line.slice(buffer.col)
  buffer.col += ch.length
  buffer.dirty = true
}

const insertNewline = (buffer: Buffer) => {
  const line = buffer.lines[buffer.row]!
  buffer.lines.splice(buffer.row, 1, line.slice(0, buffer.col), line.slice(buffer.col))
  buffer.row++
  buffer.col = 0
  buffer.dirty = true
}

const backspace = (buffer: Buffer) => {
  if (buffer.col > 0) {
    const line = buffer.lines[buffer.row]!
    buffer.lines[buffer.row] = line.slice(0, buffer.col - 1) + line.slice(buffer.col)
    buffer.col--
    buffer.dirty = true
  } else if (buffer.row > 0) {
    const line = buffer.lines.splice(buffer.row, 1)[0]!
    buffer.row--
    buffer.col = buffer.lines[buffer.row]!.length
    buffer.lines[buffer.row] = buffer.lines[buffer.row]! + line
    buffer.dirty = true
  }
}

/** Arrow-key style motion shared by both editors; true when handled. */
const move = (buffer: Buffer, key: string, allowPastEnd: boolean): boolean => {
  switch (key) {
    case 'ArrowUp':
      buffer.row = Math.max(0, buffer.row - 1)
      break
    case 'ArrowDown':
      buffer.row = Math.min(buffer.lines.length - 1, buffer.row + 1)
      break
    case 'ArrowLeft':
      buffer.col = Math.max(0, buffer.col - 1)
      return true
    case 'ArrowRight':
      buffer.col = buffer.col + 1
      clampCol(buffer, allowPastEnd)
      return true
    case 'Home':
      buffer.col = 0
      return true
    case 'End':
      buffer.col = buffer.lines[buffer.row]!.length
      clampCol(buffer, allowPastEnd)
      return true
    default:
      return false
  }
  clampCol(buffer, allowPastEnd)
  return true
}

// ---------------------------------------------------------------- nano ----

export function createNanoEditor(io: EditorIO, { onFrame, onEnd }: GameCallbacks): GameHandle {
  const buffer = makeBuffer(io.read())
  let status = ''
  let confirmExit = false

  const render = () => {
    const head = `  GNU nano-ish        ${io.filename}${buffer.dirty ? ' *' : ''}`
    const foot = confirmExit
      ? ' Save modified buffer?  y = yes, n = no, ctrl+c = cancel'
      : ' ^S Save   ^X Exit   (arrows move, just type)'
    onFrame([head, '─'.repeat(60), ...renderRows(buffer), '─'.repeat(60), status || foot].join('\n'))
  }

  const save = (): boolean => {
    const ok = io.write(buffer.lines.join('\n'))
    status = ok ? `[ wrote ${buffer.lines.length} line${buffer.lines.length === 1 ? '' : 's'} ]` : '[ write failed ]'
    if (ok) buffer.dirty = false
    return ok
  }

  render()

  return {
    onKey(key) {
      status = ''
      if (confirmExit) {
        if (key === 'y') {
          save()
          onEnd([`nano: saved ${io.filename}`])
        } else if (key === 'n') {
          onEnd([`nano: ${io.filename} left unsaved`])
        } else if (key === 'ctrl+c' || key === 'Escape') {
          confirmExit = false
          render()
        }
        return true
      }
      if (key === 'ctrl+s' || key === 'ctrl+o') {
        save()
        render()
        return true
      }
      if (key === 'ctrl+x') {
        if (buffer.dirty) {
          confirmExit = true
          render()
        } else {
          onEnd([`nano: closed ${io.filename}`])
        }
        return true
      }
      if (move(buffer, key, true)) {
        render()
        return true
      }
      if (key === 'Enter') insertNewline(buffer)
      else if (key === 'Backspace') backspace(buffer)
      else if (key.length === 1) insertChar(buffer, key)
      else return key !== 'Escape' ? false : true
      render()
      return true
    },
    stop: () => {}
  }
}

// ----------------------------------------------------------------- vim ----

export function createVimEditor(io: EditorIO, { onFrame, onEnd }: GameCallbacks): GameHandle {
  const buffer = makeBuffer(io.read())
  let mode: 'normal' | 'insert' | 'command' = 'normal'
  let command = ''
  let status = ''
  let pending = '' // half-typed normal commands (d of dd, g of gg)

  const render = () => {
    const modeLine = mode === 'command'
      ? `:${command}█`
      : mode === 'insert'
        ? '-- INSERT --'
        : status || `"${io.filename}"${buffer.dirty ? ' [+]' : ''}  ${buffer.row + 1},${buffer.col + 1}`
    onFrame([...renderRows(buffer), '─'.repeat(60), modeLine].join('\n'))
  }

  const write = (): boolean => {
    const ok = io.write(buffer.lines.join('\n'))
    status = ok
      ? `"${io.filename}" ${buffer.lines.length}L written`
      : `E212: cannot open ${io.filename} for writing`
    if (ok) buffer.dirty = false
    return ok
  }

  const runCommand = (): boolean => {
    const cmd = command.trim()
    command = ''
    mode = 'normal'
    switch (cmd) {
      case 'w':
        write()
        return false
      case 'wq':
      case 'x':
        if (write()) {
          onEnd([`vim: "${io.filename}" written — you escaped with honor`])
          return true
        }
        return false
      case 'q':
        if (buffer.dirty) {
          status = 'E37: No write since last change (add ! to override)'
          return false
        }
        onEnd([`vim: closed ${io.filename}`])
        return true
      case 'q!':
        onEnd(['vim: changes discarded. bold.'])
        return true
      default:
        status = `E492: Not an editor command: ${cmd}`
        return false
    }
  }

  const normalKey = (key: string) => {
    // pending two-key commands
    if (pending === 'd') {
      pending = ''
      if (key === 'd') {
        buffer.lines.splice(buffer.row, 1)
        if (!buffer.lines.length) buffer.lines.push('')
        buffer.row = Math.min(buffer.row, buffer.lines.length - 1)
        clampCol(buffer, false)
        buffer.dirty = true
      }
      return
    }
    if (pending === 'g') {
      pending = ''
      if (key === 'g') {
        buffer.row = 0
        clampCol(buffer, false)
      }
      return
    }
    switch (key) {
      case 'h': buffer.col = Math.max(0, buffer.col - 1); break
      case 'l': buffer.col++; clampCol(buffer, false); break
      case 'j': buffer.row = Math.min(buffer.lines.length - 1, buffer.row + 1); clampCol(buffer, false); break
      case 'k': buffer.row = Math.max(0, buffer.row - 1); clampCol(buffer, false); break
      case '0': buffer.col = 0; break
      case '$': buffer.col = Math.max(0, buffer.lines[buffer.row]!.length - 1); break
      case 'G': buffer.row = buffer.lines.length - 1; clampCol(buffer, false); break
      case 'g': pending = 'g'; break
      case 'd': pending = 'd'; break
      case 'x': {
        const line = buffer.lines[buffer.row]!
        if (line.length) {
          buffer.lines[buffer.row] = line.slice(0, buffer.col) + line.slice(buffer.col + 1)
          clampCol(buffer, false)
          buffer.dirty = true
        }
        break
      }
      case 'i': mode = 'insert'; break
      case 'a': buffer.col = Math.min(buffer.col + 1, buffer.lines[buffer.row]!.length); mode = 'insert'; break
      case 'A': buffer.col = buffer.lines[buffer.row]!.length; mode = 'insert'; break
      case 'I': buffer.col = 0; mode = 'insert'; break
      case 'o':
        buffer.lines.splice(buffer.row + 1, 0, '')
        buffer.row++
        buffer.col = 0
        buffer.dirty = true
        mode = 'insert'
        break
      case 'O':
        buffer.lines.splice(buffer.row, 0, '')
        buffer.col = 0
        buffer.dirty = true
        mode = 'insert'
        break
      case ':': mode = 'command'; command = ''; break
      default: move(buffer, key, false)
    }
  }

  render()

  return {
    onKey(key) {
      status = ''
      if (mode === 'command') {
        if (key === 'Enter') {
          if (runCommand()) return true
        } else if (key === 'Escape') {
          mode = 'normal'
          command = ''
        } else if (key === 'Backspace') {
          command = command.slice(0, -1)
        } else if (key.length === 1) {
          command += key
        }
        render()
        return true
      }
      if (mode === 'insert') {
        if (key === 'Escape') {
          mode = 'normal'
          clampCol(buffer, false)
        } else if (key === 'Enter') insertNewline(buffer)
        else if (key === 'Backspace') backspace(buffer)
        else if (move(buffer, key, true)) { /* moved */ }
        else if (key.length === 1) insertChar(buffer, key)
        else return false
        render()
        return true
      }
      // normal mode
      if (key.length === 1 || ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Escape'].includes(key)) {
        if (key !== 'Escape') normalKey(key)
        else pending = ''
        render()
        return true
      }
      return false
    },
    stop: () => {}
  }
}
