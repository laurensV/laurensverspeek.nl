import { adoptPet, feedPet, playWithPet, petStage, petMood, petFace, petMoodLine, petAge, isPetState, isPetWallet, emptyWallet, coinsEarned, gearFace, buyAccessory, SNACK_COST } from '~/utils/pet'
import type { PetState, PetWallet, ScoreReadings } from '~/utils/pet'
import { storageGet, storageGetJson, storageSetJson, storageRemove } from '~/utils/safeStorage'
import { migrateScoreKey } from '~/utils/terminalGameKit'

const PET_KEY = 'lv-pet'
const WALLET_KEY = 'lv-pet-wallet'

// coins are minted by the SAME high-score keys the hall of fame reads
const readScores = (): ScoreReadings => {
  migrateScoreKey('lv-pong-rally', 'lv-pong-highscore')
  const num = (key: string) => {
    const value = Number(storageGet(key))
    return Number.isFinite(value) && value > 0 ? value : 0
  }
  return {
    snake: num('lv-snake-highscore'),
    tetris: num('lv-tetris-highscore'),
    g2048: num('lv-2048-highscore'),
    wpm: num('lv-wpm-highscore'),
    minesBests: ['beginner', 'intermediate', 'expert']
      .filter((level) => num(`lvos-mines-best-${level}`) > 0).length,
    pong: num('lv-pong-highscore'),
    duelWins: num('lv-pong-online-wins') + num('lv-chess-online-wins')
  }
}

// one minute-tick for every caller, so moods update while the tab stays open —
// but only while a pet actually exists; no timer runs for visitors without one
let tickStarted = false
let tickTimer: ReturnType<typeof setInterval> | undefined

/** The visitor's tamagotchi: adopted in the terminal, lives in the status bar. */
export function usePet() {
  const pet = useState<PetState | null>(STATE_KEYS.petState, () => null)
  const now = useState(STATE_KEYS.petNow, () => Date.now())
  const wallet = useState<PetWallet>(STATE_KEYS.petWallet, emptyWallet)

  // restore once per visit (client-only; storage no-ops on the server)
  if (import.meta.client && !pet.value) {
    const saved = storageGetJson(PET_KEY, isPetState)
    if (saved) pet.value = saved
    const savedWallet = storageGetJson(WALLET_KEY, isPetWallet)
    if (savedWallet) wallet.value = savedWallet
  }
  if (import.meta.client && !tickStarted) {
    tickStarted = true
    // detached scope: the first caller unmounting must not stop the clock
    effectScope(true).run(() => {
      watch(pet, (p) => {
        if (p && !tickTimer) {
          tickTimer = setInterval(() => (now.value = Date.now()), 60_000)
        } else if (!p && tickTimer) {
          clearInterval(tickTimer)
          tickTimer = undefined
        }
      }, { immediate: true })
    })
  }

  const view = computed(() => {
    if (!pet.value) return null
    const stage = petStage(pet.value, now.value)
    const mood = petMood(pet.value, now.value, new Date(now.value).getHours())
    return {
      name: pet.value.name,
      stage,
      mood,
      face: gearFace(petFace(stage, mood), wallet.value.accessories),
      moodLine: petMoodLine(mood),
      age: petAge(pet.value, now.value)
    }
  })

  // the minute tick (now) keeps the balance fresh while games are being played
  const earned = computed(() => {
    void now.value
    return import.meta.client ? coinsEarned(readScores()) : 0
  })
  const coins = computed(() => Math.max(0, earned.value - wallet.value.spent))

  const saveWallet = () => storageSetJson(WALLET_KEY, wallet.value)

  /** Buy a shop accessory; returns null on success or an error line. */
  const buy = (id: string): string | null => {
    const result = buyAccessory(wallet.value, id, earned.value)
    if (typeof result === 'string') return result
    wallet.value = result
    saveWallet()
    now.value = Date.now()
    return null
  }

  /** A paid snack: feeds AND counts as play. Returns an error line or null. */
  const snack = (): string | null => {
    if (!pet.value) return 'no pet to snack'
    if (coins.value < SNACK_COST) return `a snack costs ${SNACK_COST} coins — you have ${coins.value}`
    wallet.value = { ...wallet.value, spent: wallet.value.spent + SNACK_COST }
    saveWallet()
    const time = Date.now()
    pet.value = playWithPet(feedPet(pet.value, time), time)
    storageSetJson(PET_KEY, pet.value)
    now.value = time
    return null
  }

  const save = () => {
    if (pet.value) storageSetJson(PET_KEY, pet.value)
    now.value = Date.now()
  }
  const adopt = (name: string) => {
    pet.value = adoptPet(name, Date.now())
    save()
  }
  const feed = () => {
    if (!pet.value) return
    pet.value = feedPet(pet.value, Date.now())
    save()
  }
  const play = () => {
    if (!pet.value) return
    pet.value = playWithPet(pet.value, Date.now())
    save()
  }
  const release = () => {
    pet.value = null
    storageRemove(PET_KEY)
  }

  return { pet, view, adopt, feed, play, release, coins, earned, wallet, buy, snack }
}
