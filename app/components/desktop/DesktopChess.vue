<template>
  <div class="chess is-family-code">
    <div class="chess-board" :class="{ 'is-thinking': thinking, 'is-flipped': isOnline && mySide === 'b' }">
      <button
        v-for="(piece, i) in board"
        :key="i"
        class="chess-cell"
        :class="{
          'is-dark': (Math.floor(i / 8) + i) % 2 === 1,
          'is-selected': selected === i,
          'is-target': targets.has(i),
          'is-last': lastSquares.includes(i)
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
      <template v-if="!isOnline">
        <button class="chess-new" @click="reset">+ new game</button>
        <button v-if="onlineEnabled" class="chess-new" @click="startOnline">⚔ play a live visitor</button>
        <p class="chess-hint">you play white. the house plays a shallow<br>alpha-beta search — beatable, but it does<br>take your queen when you hang it.</p>
      </template>
      <template v-else>
        <button class="chess-new" @click="backToAi">
          {{ onlinePhase === 'over' ? '← back to the house ai' : onlinePhase === 'playing' ? '✕ forfeit' : '✕ stop waiting' }}
        </button>
        <p class="chess-hint">{{ onlineHint }}</p>
      </template>
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

// online mode: relay matchmaking, server-refereed moves (useChessOnline)
const {
  enabled: onlineEnabled, phase: onlinePhase, mySide, foe,
  state: onlineState, lastMove: onlineLast, endLine,
  join: joinOnline, leave: leaveOnline, sendMove
} = useChessOnline()
const mode = ref<'ai' | 'online'>('ai')
const isOnline = computed(() => mode.value === 'online')

const board = computed(() => (isOnline.value ? onlineState.value.board : game.value.board))
const lastSquares = computed(() => (isOnline.value ? onlineLast.value : lastMove.value))

const startOnline = () => {
  mode.value = 'online'
  selected.value = null
  joinOnline()
}
const backToAi = () => {
  leaveOnline()
  mode.value = 'ai'
  selected.value = null
}
const onlineHint = computed(() => {
  if (onlinePhase.value === 'connecting') return 'dialing the chess club…'
  if (onlinePhase.value === 'waiting') return 'waiting for a challenger — another\nvisitor has to press ⚔ too.'
  if (onlinePhase.value === 'playing') return `you play ${mySide.value === 'w' ? 'white' : 'black'} vs ${foe.value}.\nthe relay referees every move with\nthe same rules you see here.`
  return 'the board stays for a post-mortem.'
})

if (import.meta.client) {
  const saved = storageGetJson(SAVE_KEY, isChessState)
  if (saved) game.value = saved
}

const over = computed(() => gameOver(game.value))
const status = computed(() => {
  if (isOnline.value) {
    if (onlinePhase.value === 'over') return endLine.value
    if (onlinePhase.value !== 'playing') return 'online chess'
    if (onlineState.value.turn !== mySide.value) return `${foe.value} is thinking…`
    return inCheck(onlineState.value, mySide.value) ? 'check! your move.' : 'your move.'
  }
  if (over.value === 'checkmate') return game.value.turn === 'w' ? 'checkmate — the house wins.' : 'checkmate — you win! 🏆'
  if (over.value === 'stalemate') return 'stalemate. a diplomatic outcome.'
  if (thinking.value) return 'the house is thinking…'
  return inCheck(game.value, 'w') ? 'check! your move.' : 'your move.'
})

const myMoves = computed(() => {
  if (isOnline.value) {
    return onlinePhase.value === 'playing' && onlineState.value.turn === mySide.value
      ? legalMoves(onlineState.value)
      : []
  }
  return game.value.turn === 'w' && !over.value ? legalMoves(game.value) : []
})
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
  if (isOnline.value) {
    if (onlinePhase.value !== 'playing') return
    const piece: Piece = onlineState.value.board[i]!
    if (selected.value !== null && targets.value.has(i)) {
      sendMove(selected.value, i)
      selected.value = null
      return
    }
    selected.value = sideOf(piece) === mySide.value ? (selected.value === i ? null : i) : null
    return
  }
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
  // shrinks with the viewport so the 8-wide board fits the non-wide window on small phones
  --chess-cell: min(2.1rem, calc((100vw - 5.5rem) / 8));
  display: grid;
  grid-template-columns: repeat(8, var(--chess-cell));
  border: 1px solid var(--bulma-border);
  border-radius: 2px;
  overflow: hidden;

  &.is-thinking {
    opacity: 0.75;
  }

  // black sees the board from black's side; pieces stay upright
  &.is-flipped {
    transform: rotate(180deg);

    .chess-piece,
    .chess-dot {
      display: inline-block;
      transform: rotate(180deg);
    }
  }
}

.chess-cell {
  position: relative;
  width: var(--chess-cell, 2.1rem);
  height: var(--chess-cell, 2.1rem);
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
  font-size: calc(var(--chess-cell, 2.1rem) * 0.69);
  line-height: 1;
  color: #17130c;

  &.is-white {
    color: #fdfdfb;
    text-shadow: 0 0 2px #17130c, 0 0 1px #17130c;
  }
}

.chess-dot {
  color: rgb(0 0 0 / 45%);
  font-size: calc(var(--chess-cell, 2.1rem) * 0.76);
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
  // the lvOS window is always dark; use scheme colours, not --bulma-* (which
  // flip to a light chip with dark text in light theme)
  border: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.3);
  border-radius: var(--bulma-radius);
  background: hsla(var(--lv-scheme-hs), 50%, 0.12);
  color: hsl(var(--lv-scheme-hs), 88%);
  font: inherit;
  padding: 0.25rem 0.7rem;
  cursor: pointer;

  &:hover {
    border-color: var(--bulma-primary);
    color: var(--bulma-primary-on-scheme);
  }
}

.chess-hint {
  color: hsl(var(--lv-scheme-hs), 55%);
}
</style>
