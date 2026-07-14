<template>
  <div class="pet is-family-code">
    <template v-if="view">
      <div class="pet-hero">
        <span class="pet-face" aria-hidden="true">{{ view.face }}</span>
        <div class="pet-meta">
          <p class="pet-name">{{ view.name }}</p>
          <p class="pet-sub">{{ view.stage }} · {{ view.moodLine }}</p>
          <p class="pet-sub">{{ view.age }} old · <strong>{{ coins }}</strong> coins</p>
        </div>
      </div>

      <div class="pet-actions">
        <button @click="feed">feed</button>
        <button @click="play">play</button>
        <button :disabled="coins < SNACK_COST" @click="onSnack">snack ({{ SNACK_COST }})</button>
      </div>
      <p v-if="actionLine" class="pet-line">{{ actionLine }}</p>

      <p class="pet-label"># the shop</p>
      <ul class="pet-shop">
        <li v-for="item in PET_SHOP" :key="item.id" class="pet-shop-row">
          <span class="pet-shop-glyph" aria-hidden="true">{{ item.glyph }}</span>
          <span class="pet-shop-name">{{ item.name }}</span>
          <button v-if="wallet.accessories.includes(item.id)" class="pet-buy is-worn" disabled>worn ✓</button>
          <button v-else class="pet-buy" :disabled="coins < item.cost" @click="onBuy(item.id)">{{ item.cost }} coins</button>
        </li>
      </ul>
      <p class="pet-note">// coins come from your game high scores — one ledger, no cheats</p>
    </template>

    <div v-else class="pet-adopt">
      <p class="pet-sub">no pet yet — adopt one:</p>
      <form class="pet-adopt-form" @submit.prevent="onAdopt">
        <input
          v-model="adoptName"
          class="pet-adopt-input"
          maxlength="16"
          placeholder="name your pet"
          aria-label="Pet name"
          spellcheck="false"
          @input="keyClick.click()"
        >
        <button class="pet-buy" type="submit" :disabled="!adoptName.trim()">adopt</button>
      </form>
      <p class="pet-note">// it hatches within the hour, sleeps at night, and wanders your desktop</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PET_SHOP, SNACK_COST } from '~/utils/pet'

// The lvOS face of the tamagotchi economy: coins minted by your game high scores
// (the SAME shared wallet the terminal `pet` command spends) buy snacks and the
// shop's accessories. Until now the desktop pet widget was feed-only; a
// keyboard-free player earned coins from windowed games they couldn't spend.
const { view, coins, wallet, feed, play, snack, buy, adopt } = usePet()
const keyClick = useKeyClick()

const actionLine = ref('')
let lineTimer: ReturnType<typeof setTimeout> | undefined
const flash = (msg: string | null) => {
  if (!msg) return // null = success; the face + coin count already updated
  actionLine.value = msg
  clearTimeout(lineTimer)
  lineTimer = setTimeout(() => { actionLine.value = '' }, 2500)
}
const onSnack = () => flash(snack())
const onBuy = (id: string) => flash(buy(id))

const adoptName = ref('')
const onAdopt = () => {
  const name = adoptName.value.trim()
  if (!name) return
  adopt(name)
  adoptName.value = ''
}

onUnmounted(() => clearTimeout(lineTimer))
</script>

<style scoped lang="scss">
.pet {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  font-size: 0.78rem;
}

.pet-hero {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.pet-face {
  font-size: 2.4rem;
  line-height: 1;
}

.pet-name {
  color: hsl(var(--lv-scheme-hs), 92%);
  font-size: 0.95rem;
}

.pet-sub {
  color: hsl(var(--lv-scheme-hs), 58%);

  strong {
    color: var(--bulma-primary);
  }
}

.pet-actions {
  display: flex;
  gap: 0.4rem;
}

.pet-actions button,
.pet-buy {
  padding: 0.3rem 0.6rem;
  border: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.3);
  border-radius: var(--bulma-radius-small);
  background: none;
  color: hsl(var(--lv-scheme-hs), 85%);
  font: inherit;
  cursor: pointer;

  &:hover:not(:disabled) {
    border-color: hsla(var(--lv-primary-hsl), 0.6);
    color: hsl(var(--lv-scheme-hs), 95%);
  }

  &:disabled {
    color: hsl(var(--lv-scheme-hs), 35%);
    cursor: default;
  }

  @media (pointer: coarse) {
    min-height: 2.4rem;
  }
}

.pet-line {
  color: var(--bulma-primary);
  font-size: 0.72rem;
}

.pet-label {
  color: hsl(var(--lv-scheme-hs), 50%);
  font-size: 0.62rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.pet-shop {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.pet-shop-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.pet-shop-glyph {
  font-size: 1.1rem;
}

.pet-shop-name {
  flex: 1;
  min-width: 0;
  color: hsl(var(--lv-scheme-hs), 78%);
}

.pet-buy.is-worn {
  border-color: transparent;
  color: hsl(var(--lv-scheme-hs), 55%);
}

.pet-note {
  color: hsl(var(--lv-scheme-hs), 50%);
  font-size: 0.68rem;
}

.pet-adopt {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.pet-adopt-form {
  display: flex;
  gap: 0.4rem;
}

.pet-adopt-input {
  flex: 1;
  min-width: 0;
  padding: 0.3rem 0.5rem;
  border: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.3);
  border-radius: var(--bulma-radius-small);
  background: none;
  color: hsl(var(--lv-scheme-hs), 90%);
  font: inherit;

  @media (pointer: coarse) {
    font-size: 16px; // no iOS focus-zoom
  }
}
</style>
