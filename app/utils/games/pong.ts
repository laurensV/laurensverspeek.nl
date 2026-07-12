import { createTicker, isQuitKey, useHighScore, migrateScoreKey } from '~/utils/terminalGameKit'
import { boxed } from '~/utils/asciiFrame'
import type { GameHandle, GameCallbacks } from '~/utils/games/types'

const PONG_W = 41
const PONG_H = 13
const PONG_PADDLE = 3
const PONG_WIN = 5
// the -highscore suffix keys the shared score surface: hall of fame, pet coins,
// and the leaderboard sink all discover games through it
const PONG_RALLY_KEY = 'lv-pong-highscore'

// Classic pong: left paddle is yours, the right one is a slightly fallible AI.
// First to 5 wins; the ball speeds up as a rally builds.
export function createPongGame({ onFrame, onEnd }: GameCallbacks): GameHandle {
  migrateScoreKey('lv-pong-rally', PONG_RALLY_KEY)
  let playerY = Math.floor(PONG_H / 2) - 1
  let aiY = playerY
  let ball = { x: PONG_W / 2, y: PONG_H / 2, vx: -1, vy: 0.5 }
  let playerScore = 0
  let aiScore = 0
  let rally = 0
  let bestRally = 0

  const resetBall = (towards: 1 | -1) => {
    ball = { x: PONG_W / 2, y: PONG_H / 2, vx: towards, vy: Math.random() > 0.5 ? 0.5 : -0.5 }
    rally = 0
  }

  const paddleHit = (paddleY: number) => {
    const y = Math.round(ball.y)
    if (y < paddleY || y >= paddleY + PONG_PADDLE) return false
    // deflection angle depends on where the ball meets the paddle
    ball.vy = (ball.y - (paddleY + PONG_PADDLE / 2)) * 0.6
    rally++
    bestRally = Math.max(bestRally, rally)
    return true
  }

  const render = () => {
    const rows: string[] = []
    for (let y = 0; y < PONG_H; y++) {
      let row = ''
      for (let x = 0; x < PONG_W; x++) {
        const isBall = Math.round(ball.x) === x && Math.round(ball.y) === y
        const isPlayer = x === 1 && y >= playerY && y < playerY + PONG_PADDLE
        const isAi = x === PONG_W - 2 && y >= aiY && y < aiY + PONG_PADDLE
        const isNet = x === Math.floor(PONG_W / 2) && y % 2 === 0
        row += isBall ? '●' : isPlayer || isAi ? '█' : isNet ? '·' : ' '
      }
      rows.push(row)
    }
    const score = `you ${playerScore} — ${aiScore} cpu`
    onFrame([
      `PONG  ${score}  (w/s or ↑/↓ · q quits)`,
      ...boxed(rows, PONG_W)
    ].join('\n'))
  }

  const finish = () => {
    ticker.stop()
    const won = playerScore > aiScore
    const { isNew, best } = useHighScore(PONG_RALLY_KEY).record(bestRally)
    onEnd([
      won ? `you win ${playerScore}–${aiScore}! the cpu demands a rematch` : `the cpu wins ${aiScore}–${playerScore} — it had it coming`,
      `longest rally: ${bestRally} hits`,
      isNew ? `new rally record! previous best: ${best}` : `rally record: ${best}`
    ])
  }

  const tick = () => {
    ball.x += ball.vx
    ball.y += ball.vy
    // wall bounce
    if (ball.y <= 0) {
      ball.y = 0
      ball.vy = Math.abs(ball.vy)
    } else if (ball.y >= PONG_H - 1) {
      ball.y = PONG_H - 1
      ball.vy = -Math.abs(ball.vy)
    }
    // paddles
    if (ball.vx < 0 && Math.round(ball.x) <= 1) {
      if (paddleHit(playerY)) ball.vx = 1
      else {
        aiScore++
        if (aiScore >= PONG_WIN) return finish()
        resetBall(-1)
      }
    } else if (ball.vx > 0 && Math.round(ball.x) >= PONG_W - 2) {
      if (paddleHit(aiY)) ball.vx = -1
      else {
        playerScore++
        if (playerScore >= PONG_WIN) return finish()
        resetBall(1)
      }
    }
    // the AI tracks the ball, one row per tick, and hesitates far from it
    const target = Math.round(ball.y) - Math.floor(PONG_PADDLE / 2)
    if (ball.vx > 0 && ball.x > PONG_W / 3) {
      if (aiY < target) aiY++
      else if (aiY > target) aiY--
      aiY = Math.max(0, Math.min(PONG_H - PONG_PADDLE, aiY))
    }
    render()
  }

  render()
  // the rally speeds the ball up; resets each point
  const ticker = createTicker(tick, () => Math.max(45, 85 - rally * 4))
  ticker.start()

  const movePlayer = (delta: number) => {
    playerY = Math.max(0, Math.min(PONG_H - PONG_PADDLE, playerY + delta))
    render()
  }

  return {
    onKey(key) {
      if (isQuitKey(key)) {
        ticker.stop()
        onEnd([`pong aborted at ${playerScore}–${aiScore} — the cpu claims victory by default`])
        return true
      }
      const lower = key.toLowerCase()
      if (key === 'ArrowUp' || lower === 'w') {
        movePlayer(-1)
        return true
      }
      if (key === 'ArrowDown' || lower === 's') {
        movePlayer(1)
        return true
      }
      return false
    },
    stop: () => ticker.stop()
  }
}
