<template>
  <div class="scores is-family-code">
    <p class="scores-title">★ HALL OF FAME ★</p>
    <table class="scores-table">
      <tbody>
        <tr v-for="row in rows" :key="row.game">
          <td class="scores-game">{{ row.game }}</td>
          <td class="scores-value" :class="{ 'is-unset': row.value === null }">
            {{ row.value ?? '———' }}
          </td>
          <td class="scores-unit">{{ row.value === null ? 'no entry yet' : row.unit }}</td>
        </tr>
      </tbody>
    </table>
    <p class="scores-note">scores live in your browser — set them in the terminal games, snake or mines.exe</p>
  </div>
</template>

<script setup lang="ts">
import { storageGet } from '~/utils/safeStorage'

// One arcade board over every game's persisted best. Reads the same keys the
// games write, at open time — play, close, reopen, gloat.

const readNumber = (key: string): number | null => {
  const value = Number(storageGet(key))
  return Number.isFinite(value) && value > 0 ? value : null
}

const rows = [
  { game: 'snake', value: readNumber('lv-snake-highscore'), unit: 'points' },
  { game: 'tetris', value: readNumber('lv-tetris-highscore'), unit: 'points' },
  { game: '2048', value: readNumber('lv-2048-highscore'), unit: 'points' },
  { game: 'typing test', value: readNumber('lv-wpm-highscore'), unit: 'wpm' },
  { game: 'minesweeper · beginner', value: readNumber('lvos-mines-best-beginner'), unit: 'seconds' },
  { game: 'minesweeper · intermediate', value: readNumber('lvos-mines-best-intermediate'), unit: 'seconds' },
  { game: 'minesweeper · expert', value: readNumber('lvos-mines-best-expert'), unit: 'seconds' }
]
</script>

<style scoped lang="scss">
.scores {
  min-width: 20rem;
  font-size: 0.78rem;
}

.scores-title {
  margin-bottom: 0.7rem;
  color: var(--bulma-primary);
  text-align: center;
  font-weight: 700;
  letter-spacing: 0.2em;
}

.scores-table {
  width: 100%;
  border-collapse: collapse;

  td {
    padding: 0.25rem 0.5rem;
    border-bottom: 1px dashed hsla(var(--lv-scheme-hs), 50%, 0.15);
  }

  .scores-game {
    color: hsl(var(--lv-scheme-hs), 88%);
  }

  .scores-value {
    text-align: right;
    color: var(--bulma-primary);
    font-weight: 700;

    &.is-unset {
      color: hsl(var(--lv-scheme-hs), 40%);
      font-weight: 400;
    }
  }

  .scores-unit {
    color: hsl(var(--lv-scheme-hs), 50%);
    font-size: 0.68rem;
  }
}

.scores-note {
  margin-top: 0.7rem;
  color: hsl(var(--lv-scheme-hs), 50%);
  font-size: 0.68rem;
}
</style>
