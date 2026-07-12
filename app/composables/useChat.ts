import type { ChatMessage, ServerMessage, ChatJoinIn, ChatLeaveIn, ChatSendIn } from '../../realtime/protocol'
import type { Ref } from 'vue'

// The site chat room, over the cursors relay. ONE shared feed: the terminal
// `chat` command and the lvOS chat app render the same useState refs, so they
// can never show two different rooms. The socket is refcounted — each consumer
// takes a lease with join() and returns it; the connection closes when the
// last one leaves. Ephemeral by design: the relay keeps ~50 messages in memory.

let socket: WebSocket | null = null
let leases = 0

const sendFrame = (frame: ChatJoinIn | ChatLeaveIn | ChatSendIn) => {
  if (socket?.readyState === 1) socket.send(JSON.stringify(frame))
}

export function useChat() {
  const wsUrl = useRuntimeConfig().public.cursorsWs
  const { name } = useIdentity()

  const enabled = computed(() => !!wsUrl)
  const messages = useState<ChatMessage[]>(STATE_KEYS.chatMessages, () => [])
  const online = useState(STATE_KEYS.chatOnline, () => 0)
  const status: Ref<'offline' | 'connecting' | 'open' | 'lost'> = useState(STATE_KEYS.chatStatus, () => 'offline')

  const connect = () => {
    if (!wsUrl || socket) return
    status.value = 'connecting'
    try {
      socket = new WebSocket(wsUrl)
    } catch {
      socket = null
      status.value = 'lost'
      return
    }
    socket.addEventListener('open', () => sendFrame({ type: 'chat-join' }))
    socket.addEventListener('close', () => {
      // deliberate teardown nulls `socket` first; anything else is a drop
      if (socket) {
        socket = null
        status.value = 'lost'
      }
    })
    socket.addEventListener('message', (event) => {
      let msg: ServerMessage
      try {
        msg = JSON.parse(String(event.data)) as ServerMessage
      } catch {
        return
      }
      if (msg.type === 'chat-state') {
        messages.value = msg.messages
        online.value = msg.online
        status.value = 'open'
      } else if (msg.type === 'chat-msg') {
        messages.value = [...messages.value.slice(-99), { name: msg.name, text: msg.text, at: msg.at }]
      } else if (msg.type === 'chat-count') {
        online.value = msg.online
      }
    })
  }

  /** Take a lease on the room. Returns a release function — always call it. */
  const join = (): (() => void) => {
    if (!wsUrl) return () => {}
    leases++
    connect()
    let released = false
    return () => {
      if (released) return
      released = true
      leases--
      if (leases <= 0 && socket) {
        sendFrame({ type: 'chat-leave' })
        const open = socket
        socket = null // mark deliberate before close() fires the handler
        open.close()
        status.value = 'offline'
      }
    }
  }

  const send = (text: string) => {
    const trimmed = text.trim().slice(0, 200)
    if (!trimmed) return
    sendFrame({ type: 'chat-send', text: trimmed, name: name.value })
  }

  return { enabled, messages, online, status, join, send }
}
