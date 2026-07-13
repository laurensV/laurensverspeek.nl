import { describe, it, expect } from 'vitest'
import { planPersonalBest } from '../app/utils/celebration'

describe('planPersonalBest', () => {
  it('triggers a burst and clears any stale world-record flag when idle', () => {
    // a plain personal best with nothing else in flight
    expect(planPersonalBest(false)).toEqual({ trigger: true, clearWorldRecord: true })
  })

  it('stands down when a world-record celebration already owns this tick', () => {
    // the leaderboard set celebrateActive (and worldRecord) a moment earlier;
    // this personal-best sink must not clobber the big burst or the toast
    expect(planPersonalBest(true)).toEqual({ trigger: false, clearWorldRecord: false })
  })
})
