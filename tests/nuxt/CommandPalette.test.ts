// @vitest-environment nuxt
import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import CommandPalette from '~/components/CommandPalette.vue'

describe('CommandPalette', () => {
  it('opens, filters by query and highlights the match', async () => {
    const wrapper = await mountSuspended(CommandPalette)
    // starts closed (teleported dialog absent)
    expect(wrapper.find('.palette-window').exists()).toBe(false)

    const palette = useCommandPalette()
    palette.open()
    await flushPromises()
    expect(document.querySelector('.palette-window')).toBeTruthy()

    const input = document.querySelector('.palette-input') as HTMLInputElement
    input.value = 'uses'
    input.dispatchEvent(new Event('input'))
    await flushPromises()

    const active = document.querySelector('.palette-item.is-active')
    expect(active?.textContent).toContain('Uses')
    expect(document.querySelector('.palette-item.is-active .palette-match')).toBeTruthy()
    palette.close()
  })
})
