import { adoptPet, feedPet, playWithPet, petStage, petMood, petFace, petMoodLine, petAge, isPetState } from '~/utils/pet'
import type { PetState } from '~/utils/pet'
import { storageGetJson, storageSetJson, storageRemove } from '~/utils/safeStorage'

const PET_KEY = 'lv-pet'

// one minute-tick for every caller, so moods update while the tab stays open —
// but only while a pet actually exists; no timer runs for visitors without one
let tickStarted = false
let tickTimer: ReturnType<typeof setInterval> | undefined

/** The visitor's tamagotchi: adopted in the terminal, lives in the status bar. */
export function usePet() {
  const pet = useState<PetState | null>(STATE_KEYS.petState, () => null)
  const now = useState(STATE_KEYS.petNow, () => Date.now())

  // restore once per visit (client-only; storage no-ops on the server)
  if (import.meta.client && !pet.value) {
    const saved = storageGetJson(PET_KEY, isPetState)
    if (saved) pet.value = saved
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
      face: petFace(stage, mood),
      moodLine: petMoodLine(mood),
      age: petAge(pet.value, now.value)
    }
  })

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

  return { pet, view, adopt, feed, play, release }
}
