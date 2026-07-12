import type { ChatMessage, ServerMessage, ChatJoinIn, ChatLeaveIn, ChatSendIn } from '../../realtime/protocol'
import type { Ref } from 'vue'
import { createRelayConnection, type RelayConnection } from '~/utils/relaySocket'

// The site chat room, over the cursors relay. ONE shared feed: the terminal
// `chat` command and the lvOS chat app render the same useState refs, so they
// can never show two different rooms. The connection is a refcounted lease on
// the shared relay-socket core — it closes when the last consumer leaves.
// Ephemeral by design: the relay keeps ~50 messages in memory.

let conn: RelayConnection | null = null
// mirrors the core's lease count so the LAST leaver can say goodbye first
let chatLeases = 0

export function useChat() {
  const wsUrl = useRuntimeConfig().public.cursorsWs
  const { name } = useIdentity()

  const enabled = computed(() => !!wsUrl)
  const messages = useState<ChatMessage[]>(STATE_KEYS.chatMessages, () => [])
  const online = useState(STATE_KEYS.chatOnline, () => 0)
  const status: Ref<'offline' | 'connecting' | 'open' | 'lost'> = useState(STATE_KEYS.chatStatus, () => 'offline')

  conn ??= wsUrl
    ? createRelayConnection(wsUrl, {
        onOpen: () => conn?.send({ type: 'chat-join' } satisfies ChatJoinIn),
        onDrop: () => (status.value = 'lost'),
        onFail: () => (status.value = 'lost'),
        onFrame: (raw) => {
          const msg = raw as ServerMessage
          if (msg.type === 'chat-state') {
            messages.value = msg.messages
            online.value = msg.online
            status.value = 'open'
          } else if (msg.type === 'chat-msg') {
            messages.value = [...messages.value.slice(-99), { name: msg.name, text: msg.text, at: msg.at }]
          } else if (msg.type === 'chat-count') {
            online.value = msg.online
          }
        }
      })
    : null

  /** Take a lease on the room. Returns a release function — always call it. */
  const join = (): (() => void) => {
    if (!conn) return () => {}
    if (status.value !== 'open') status.value = 'connecting'
    chatLeases++
    const release = conn.acquire()
    let released = false
    return () => {
      if (released) return
      released = true
      chatLeases--
      // the last leaver says goodbye before the core closes the socket
      if (chatLeases <= 0) {
        conn?.send({ type: 'chat-leave' } satisfies ChatLeaveIn)
        status.value = 'offline'
      }
      release()
    }
  }

  const send = (text: string) => {
    const trimmed = text.trim().slice(0, 200)
    if (!trimmed) return
    conn?.send({ type: 'chat-send', text: trimmed, name: name.value } satisfies ChatSendIn)
  }

  return { enabled, messages, online, status, join, send }
}
