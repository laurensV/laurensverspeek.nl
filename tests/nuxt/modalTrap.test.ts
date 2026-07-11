// @vitest-environment nuxt
import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import CommandPalette from '~/components/CommandPalette.vue'
import TerminalOverlay from '~/components/TerminalOverlay.vue'

describe('modal focus traps', () => {
  it('the command palette focuses its input on open and closes on Escape', async () => {
    await mountSuspended(CommandPalette)
    const palette = useCommandPalette()
    palette.open()
    await flushPromises()
    const input = document.querySelector('.palette-input') as HTMLInputElement | null
    expect(input).toBeTruthy()
    // aria-modal is honored: the dialog wrapper carries the trap
    expect(document.querySelector('.palette-backdrop[aria-modal="true"]')).toBeTruthy()
    // Escape from the input closes it
    input!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()
    expect(document.querySelector('.palette-window')).toBeFalsy()
  })

  it('the terminal overlay is a labelled modal dialog with a focus-trapped window', async () => {
    await mountSuspended(TerminalOverlay)
    const terminal = useTerminal()
    terminal.open()
    await flushPromises()
    const dialog = document.querySelector('.terminal-backdrop[role="dialog"][aria-modal="true"]')
    expect(dialog).toBeTruthy()
    // the decorative traffic-light dot is not a fake button anymore
    expect(document.querySelector('.dot.dot-close[role="button"]')).toBeFalsy()
    terminal.close()
  })
})
