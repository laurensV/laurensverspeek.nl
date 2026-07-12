<template>
  <div class="chess is-family-code">
    <div class="chess-board" :class="{ 'is-thinking': thinking }">
      <button
        v-for="(piece, i) in game.board"
        :key="i"
        class="chess-cell"
        :class="{
          'is-dark': (Math.floor(i / 8) + i) % 2 === 1,
          'is-selected': selected === i,
          'is-target': targets.has(i),
          'is-last': lastMove.includes(i)
        }"
        :aria-label="`${squareName(i)}${piece ? ' ' + piece : ''}`"
        @click="tap(i)"
      >
        <span v-if="piece" class="chess-piece" :class="{ 'is-white': piece === piece.toUpperCase() }">
          {{ PIECE_GLYPHS[piece] }}
        </span>
        <span v-else-if="targets.has(i)" class="chess-dot" aria-hidden="true">·</span>
      </button>
    </div>
    <div class="chess-side">
      <p class="chess-status">{{ status }}</p>
      <button class="chess-new" @click="reset">+ new game</button>
      <p class="chess-hint">you play white. the house plays a shallow<br>alpha-beta search — beatable, but it does<br>take your queen when you hang it.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  initialState, legalMoves, applyMove, inCheck, gameOver, bestMove, squareName,
  PIECE_GLYPHS, sideOf
} from '~/utils/chess'
import type { ChessState, ChessMove, Piece } from '~/utils/chess'
import { storageGetJson, storageSetJson, storageRemove } from '~/utils/safeStorage'

// Chess against a small pure engine (utils/chess). The game survives closing
// the window: state persists per move and restores on reopen.

const SAVE_KEY = 'lv-chess'

const PIECES = new Set(['', ...Object.keys(PIECE_GLYPHS)])
const isChessState = (value: unknown): value is ChessState => {
  if (!value || typeof value !== 'object') return false
  const state = value as Partial<ChessState>
  return Array.isArray(state.board) && state.board.length === 64
    && state.board.every((piece) => PIECES.has(piece))
    && (state.turn === 'w' || state.turn === 'b')
    && !!state.castling && typeof state.castling === 'object'
    && (state.ep === null || typeof state.ep === 'number')
}

const game = ref<ChessState>(initialState())
const selected = ref<number | null>(null)
const thinking = ref(false)
const lastMove = ref<number[]>([])

if (import.meta.client) {
  const saved = storageGetJson(SAVE_KEY, isChessState)
  if (saved) game.value = saved
}

const over = computed(() => gameOver(game.value))
const status = computed(() => {
  if (over.value === 'checkmate') return game.value.turn === 'w' ? 'checkmate — the house wins.' : 'checkmate — you win! 🏆'
  if (over.value === 'stalemate') return 'stalemate. a diplomatic outcome.'
  if (thinking.value) return 'the house is thinking…'
  return inCheck(game.value, 'w') ? 'check! your move.' : 'your move.'
})

const myMoves = computed(() => (game.value.turn === 'w' && !over.value ? legalMoves(game.value) : []))
const targets = computed(() => {
  if (selected.value === null) return new Set<number>()
  return new Set(myMoves.value.filter((m) => m.from === selected.value).map((m) => m.to))
})

const save = () => storageSetJson(SAVE_KEY, game.value)

const play = (move: ChessMove) => {
  game.value = applyMove(game.value, move)
  lastMove.value = [move.from, move.to]
  save()
}

const houseReply = () => {
  if (game.value.turn !== 'b' || over.value) return
  thinking.value = true
  // let the "thinking…" status paint before the search blocks the thread
  setTimeout(() => {
    const reply = bestMove(game.value, 2)
    if (reply) play(reply)
    thinking.value = false
  }, 350)
}

const tap = (i: number) => {
  if (thinking.value || over.value) return
  const piece: Piece = game.value.board[i]!
  if (selected.value !== null && targets.value.has(i)) {
    const move = myMoves.value.find((m) => m.from === selected.value && m.to === i)!
    selected.value = null
    play(move)
    houseReply()
    return
  }
  selected.value = sideOf(piece) === 'w' ? (selected.value === i ? null : i) : null
}

const reset = () => {
  game.value = initialState()
  selected.value = null
  lastMove.value = []
  storageRemove(SAVE_KEY)
}

// restored mid-house-turn (closed the window while it thought): finish the move
onMounted(houseReply)
</script>

<style scoped lang="scss">
.chess {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  flex-wrap: wrap;
}

.chess-board {
  display: grid;
  grid-template-columns: repeat(8, 2.1rem);
  border: 1px solid var(--bulma-border);
  border-radius: 2px;
  overflow: hidden;

  &.is-thinking {
    opacity: 0.75;
  }
}

.chess-cell {
  position: relative;
  width: 2.1rem;
  height: 2.1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  padding: 0;
  cursor: pointer;
  background-color: #e9e0c8;

  &.is-dark {
    background-color: #a98a5c;
  }

  &.is-last {
    box-shadow: inset 0 0 0 2px hsla(44, 100%, 50%, 0.55);
  }

  &.is-selected {
    box-shadow: inset 0 0 0 2px var(--bulma-primary);
  }

  &.is-target {
    box-shadow: inset 0 0 0 2px hsla(44, 100%, 50%, 0.35);
  }
}

.chess-piece {
  font-size: 1.45rem;
  line-height: 1;
  color: #17130c;

  &.is-white {
    color: #fdfdfb;
    text-shadow: 0 0 2px #17130c, 0 0 1px #17130c;
  }
}

.chess-dot {
  color: rgb(0 0 0 / 45%);
  font-size: 1.6rem;
  line-height: 1;
}

.chess-side {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  font-size: 0.72rem;
  min-width: 11rem;
}

.chess-status {
  font-weight: 600;
}

.chess-new {
  align-self: flex-start;
  border: 1px solid var(--bulma-border);
  border-radius: var(--bulma-radius);
  background: var(--bulma-scheme-main-bis);
  color: var(--bulma-text);
  font: inherit;
  padding: 0.25rem 0.7rem;
  cursor: pointer;

  &:hover {
    border-color: var(--bulma-primary);
    color: var(--bulma-primary-on-scheme);
  }
}

.chess-hint {
  color: var(--bulma-text-weak);
}
</style>
