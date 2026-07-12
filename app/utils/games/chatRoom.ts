import type { GameHandle, GameCallbacks } from '~/utils/games/types'
import type { useChat } from '~/composables/useChat'

// The terminal face of the chat room: a GameHandle that takes over input and
// renders the SAME shared feed the lvOS chat app shows (useChat). Only Escape
// leaves — 'q' is a perfectly good letter in a sentence.

interface ChatRoomOptions {
  chat: ReturnType<typeof useChat>
  playerName: string
}

export function createChatRoom(
  { chat, playerName }: ChatRoomOptions,
  { onFrame, onEnd }: GameCallbacks
): GameHandle {
  let buffer = ''
  const release = chat.join()

  const render = () => {
    const feed = chat.messages.value.slice(-12).map((msg) => `<${msg.name}> ${msg.text}`)
    const statusLine = chat.status.value === 'open'
      ? `${chat.online.value} online`
      : chat.status.value === 'lost' ? 'connection lost' : 'connecting…'
    onFrame([
      `#lounge — ${statusLine}  (enter sends · esc leaves · same room as the lvOS chat app)`,
      '',
      ...(feed.length ? feed : ['(nobody has said anything yet — the room forgets fast, say hi)']),
      '',
      `${playerName}> ${buffer}▌`
    ].join('\n'))
  }

  const stopWatch = watch([chat.messages, chat.online, chat.status], render)
  render()

  const stop = () => {
    stopWatch()
    release()
  }

  return {
    onKey(key) {
      if (key === 'Escape') {
        stop()
        onEnd(['chat: left #lounge — the room waves'])
        return true
      }
      if (key === 'Enter') {
        // keep the line if it couldn't be sent (socket down) rather than eat it
        if (chat.send(buffer)) buffer = ''
        render()
        return true
      }
      if (key === 'Backspace') {
        buffer = buffer.slice(0, -1)
        render()
        return true
      }
      if (key.length === 1) {
        buffer = (buffer + key).slice(0, 200)
        render()
        return true
      }
      return false
    },
    stop
  }
}
