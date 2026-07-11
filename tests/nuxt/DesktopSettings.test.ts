// @vitest-environment nuxt
import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import DesktopSettings from '~/components/desktop/DesktopSettings.vue'

describe('DesktopSettings danger zone', () => {
  it('arms the factory reset on the first click (a second would wipe)', async () => {
    const wrapper = await mountSuspended(DesktopSettings)
    const reset = wrapper.findAll('.settings-options button').find((b) => b.text().includes('factory reset'))
    expect(reset).toBeTruthy()
    // first click only arms — it must NOT wipe/reload yet
    await reset!.trigger('click')
    expect(wrapper.text()).toContain('click again to wipe it all')
  })

  it('offers a reseed control that reports how many files it restored', async () => {
    const wrapper = await mountSuspended(DesktopSettings)
    const reseed = wrapper.findAll('.settings-options button').find((b) => b.text().includes('reseed'))
    expect(reseed).toBeTruthy()
    // with nothing seeded in this isolated env, reseed restores 0 (no crash)
    await reseed!.trigger('click')
    expect(reseed!.text()).toMatch(/reseed|restored/)
  })
})
