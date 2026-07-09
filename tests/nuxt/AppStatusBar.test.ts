// @vitest-environment nuxt
import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AppStatusBar from '~/components/AppStatusBar.vue'

describe('AppStatusBar', () => {
  it('cycles presence, line endings and language on click', async () => {
    const wrapper = await mountSuspended(AppStatusBar)

    const online = wrapper.find('.status-online')
    expect(online.text()).toContain('online')
    await online.trigger('click')
    expect(online.text()).toContain('away')

    const eol = wrapper.find('.status-eol')
    expect(eol.text()).toBe('LF')
    await eol.trigger('click')
    expect(eol.text()).toBe('CRLF')

    const lang = wrapper.find('.status-lang')
    expect(lang.text()).toBe('Vue')
    await lang.trigger('click')
    expect(lang.text()).toBe('TypeScript')
  })

  it('hides the live-visitor badge when no relay is configured', async () => {
    const wrapper = await mountSuspended(AppStatusBar)
    expect(wrapper.find('.status-visitors').exists()).toBe(false)
  })
})
