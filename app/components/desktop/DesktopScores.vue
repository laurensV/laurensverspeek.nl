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

    <!-- the global board only appears when the site is built with a relay -->
    <template v-if="leaderboard.enabled.value">
      <p class="scores-title scores-global-title">🌐 GLOBAL TOP {{ leaderboard.connected.value ? '' : '(connecting…)' }}</p>
      <div v-for="game in leaderboard.GAMES" :key="game" class="scores-global-game">
        <p class="scores-global-game-name">{{ game }}</p>
        <table class="scores-table">
          <tbody>
            <tr v-for="(entry, i) in (leaderboard.boards.value[game] ?? []).slice(0, 5)" :key="i">
              <td class="scores-rank">{{ i + 1 }}.</td>
              <td class="scores-game">{{ entry.name }}</td>
              <td class="scores-value">{{ entry.score }}</td>
            </tr>
            <tr v-if="!(leaderboard.boards.value[game] ?? []).length">
              <td class="scores-unit" colspan="3">no scores yet — be the first</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { migrateScoreKey } from '~/utils/terminalGameKit'
import { HALL_OF_FAME, readBest } from '~/utils/hallOfFame'

// One arcade board over every game's persisted best (local), plus the GLOBAL
// leaderboard from the relay when one is configured. Reads the same shared
// hall-of-fame list the terminal `scores` command uses, at open time — play,
// close, reopen, gloat.

const leaderboard = useLeaderboard()
onMounted(() => leaderboard.enter())

migrateScoreKey('lv-pong-rally', 'lv-pong-highscore')

const rows = HALL_OF_FAME.map(entry => ({ ...entry, value: readBest(entry.key) }))
</script>

<style scoped lang="scss">
.scores {
  min-width: min(20rem, 100%);
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

.scores-global-title {
  margin-top: 1rem;
  font-size: 0.72rem;
}

.scores-global-game {
  margin-top: 0.5rem;

  .scores-global-game-name {
    color: hsl(var(--lv-scheme-hs), 70%);
    font-size: 0.68rem;
  }
}

.scores-rank {
  color: hsl(var(--lv-scheme-hs), 45%);
  width: 1.5rem;
}
</style>
