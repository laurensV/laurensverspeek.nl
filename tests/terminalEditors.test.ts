import { describe, it, expect } from 'vitest'
import { createNanoEditor, createVimEditor, type EditorIO } from '~/utils/terminalEditors'
import type { GameCallbacks } from '~/utils/terminalGames'

const makeIo = (initial = '') => {
  const state = { content: initial, writes: 0 }
  const io: EditorIO = {
    filename: 'test.txt',
    read: () => state.content,
    write: (content) => {
      state.content = content
      state.writes++
      return true
    }
  }
  return { io, state }
}

const makeCallbacks = () => {
  const frames: string[] = []
  const ended: string[][] = []
  const callbacks: GameCallbacks = {
    onFrame: (frame) => frames.push(frame),
    onEnd: (lines) => ended.push(lines)
  }
  return { frames, ended, callbacks }
}

const type = (editor: { onKey: (k: string) => boolean }, text: string) => {
  for (const ch of text) editor.onKey(ch)
}

describe('createNanoEditor', () => {
  it('types, saves with ctrl+s and exits clean with ctrl+x', () => {
    const { io, state } = makeIo()
    const { frames, ended, callbacks } = makeCallbacks()
    const nano = createNanoEditor(io, callbacks)
    expect(frames[0]).toContain('test.txt')
    type(nano, 'hello')
    nano.onKey('Enter')
    type(nano, 'world')
    expect(nano.onKey('ctrl+s')).toBe(true)
    expect(state.content).toBe('hello\nworld')
    nano.onKey('ctrl+x')
    expect(ended[0]![0]).toContain('closed')
  })

  it('confirms before discarding unsaved changes', () => {
    const { io, state } = makeIo('keep me')
    const { frames, ended, callbacks } = makeCallbacks()
    const nano = createNanoEditor(io, callbacks)
    type(nano, 'X')
    nano.onKey('ctrl+x')
    expect(frames.at(-1)).toContain('Save modified buffer?')
    nano.onKey('n')
    expect(ended[0]![0]).toContain('unsaved')
    expect(state.content).toBe('keep me')
  })

  it('backspace joins lines', () => {
    const { io, state } = makeIo('ab\ncd')
    const { callbacks } = makeCallbacks()
    const nano = createNanoEditor(io, callbacks)
    nano.onKey('ArrowDown')
    nano.onKey('Backspace')
    nano.onKey('ctrl+s')
    expect(state.content).toBe('abcd')
  })
})

describe('createVimEditor', () => {
  it('starts in normal mode: typing does not insert until i', () => {
    const { io, state } = makeIo('')
    const { callbacks } = makeCallbacks()
    const vim = createVimEditor(io, callbacks)
    // j/k are motions in normal mode, not text
    vim.onKey('j')
    vim.onKey('i')
    type(vim, 'hi')
    vim.onKey('Escape')
    vim.onKey(':')
    type(vim, 'w')
    vim.onKey('Enter')
    expect(state.content).toBe('hi')
  })

  it(':wq writes and ends; :q refuses on a dirty buffer; :q! discards', () => {
    const { io, state } = makeIo('line')
    const { frames, ended, callbacks } = makeCallbacks()
    const vim = createVimEditor(io, callbacks)
    vim.onKey('A')
    type(vim, '!')
    vim.onKey('Escape')
    vim.onKey(':')
    type(vim, 'q')
    vim.onKey('Enter')
    expect(frames.at(-1)).toContain('E37')
    expect(ended).toHaveLength(0)
    vim.onKey(':')
    type(vim, 'wq')
    vim.onKey('Enter')
    expect(state.content).toBe('line!')
    expect(ended).toHaveLength(1)
  })

  it('x deletes a char and dd deletes the line', () => {
    const { io, state } = makeIo('abc\ndef')
    const { callbacks } = makeCallbacks()
    const vim = createVimEditor(io, callbacks)
    vim.onKey('x') // abc → bc
    vim.onKey('j')
    vim.onKey('d')
    vim.onKey('d') // drop def
    vim.onKey(':')
    type(vim, 'wq')
    vim.onKey('Enter')
    expect(state.content).toBe('bc')
  })

  it('o opens a line below and G jumps to the end', () => {
    const { io, state } = makeIo('top\nbottom')
    const { callbacks } = makeCallbacks()
    const vim = createVimEditor(io, callbacks)
    vim.onKey('o')
    type(vim, 'middle')
    vim.onKey('Escape')
    vim.onKey('G')
    vim.onKey('A')
    type(vim, '!')
    vim.onKey('Escape')
    vim.onKey(':')
    type(vim, 'wq')
    vim.onKey('Enter')
    expect(state.content).toBe('top\nmiddle\nbottom!')
  })
})
