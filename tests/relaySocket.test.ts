import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRelayConnection } from '../app/utils/relaySocket'

// a minimal scriptable WebSocket stand-in
class FakeSocket {
  static instances: FakeSocket[] = []
  readyState = 0
  sent: string[] = []
  listeners: Record<string, ((event: { data?: string }) => void)[]> = {}
  constructor(public url: string) {
    FakeSocket.instances.push(this)
  }

  addEventListener(type: string, fn: (event: { data?: string }) => void) {
    (this.listeners[type] ??= []).push(fn)
  }

  send(data: string) {
    this.sent.push(data)
  }

  close() {
    this.readyState = 3
    this.fire('close')
  }

  fire(type: string, event: { data?: string } = {}) {
    this.listeners[type]?.forEach((fn) => fn(event))
  }

  open() {
    this.readyState = 1
    this.fire('open')
  }
}

const factory = (url: string) => new FakeSocket(url) as unknown as WebSocket
const latest = () => FakeSocket.instances.at(-1)!

beforeEach(() => {
  FakeSocket.instances = []
  vi.useFakeTimers()
})
afterEach(() => vi.useRealTimers())

describe('createRelayConnection', () => {
  it('connects on the first lease, closes when the last lease releases', () => {
    const conn = createRelayConnection('ws://relay', { onFrame: () => {} }, { socketFactory: factory })
    expect(FakeSocket.instances).toHaveLength(0) // lazy until acquired
    const releaseA = conn.acquire()
    const releaseB = conn.acquire()
    expect(FakeSocket.instances).toHaveLength(1)
    latest().open()
    expect(conn.isOpen()).toBe(true)
    releaseA()
    releaseA() // idempotent: double release must not steal B's lease
    expect(conn.isOpen()).toBe(true)
    releaseB()
    expect(conn.isOpen()).toBe(false)
    expect(conn.active()).toBe(false)
  })

  it('parses frames, guards non-JSON, and reports opens and drops', () => {
    const frames: unknown[] = []
    const events: string[] = []
    const conn = createRelayConnection('ws://relay', {
      onFrame: (msg) => frames.push(msg),
      onOpen: () => events.push('open'),
      onDrop: () => events.push('drop')
    }, { socketFactory: factory })
    conn.acquire()
    latest().open()
    latest().fire('message', { data: '{"type":"hello"}' })
    latest().fire('message', { data: 'not json at all' })
    latest().fire('message', { data: '{"type":"pixel","x":1}' })
    expect(frames).toEqual([{ type: 'hello' }, { type: 'pixel', x: 1 }])
    latest().fire('close') // unexpected: not via release
    expect(events).toEqual(['open', 'drop'])
  })

  it('a deliberate release never reports a drop', () => {
    const events: string[] = []
    const conn = createRelayConnection('ws://relay', { onFrame: () => {}, onDrop: () => events.push('drop') }, { socketFactory: factory })
    const release = conn.acquire()
    latest().open()
    release()
    expect(events).toEqual([])
  })

  it('reconnects with capped backoff while leased, and stops after release', () => {
    const conn = createRelayConnection('ws://relay', { onFrame: () => {} }, {
      socketFactory: factory,
      reconnect: true,
      baseDelayMs: 1000,
      maxDelayMs: 3000
    })
    const release = conn.acquire()
    latest().fire('close')
    vi.advanceTimersByTime(1000)
    expect(FakeSocket.instances).toHaveLength(2)
    latest().fire('close')
    vi.advanceTimersByTime(2000)
    expect(FakeSocket.instances).toHaveLength(3)
    latest().fire('close')
    vi.advanceTimersByTime(3000) // capped at maxDelayMs
    expect(FakeSocket.instances).toHaveLength(4)
    // a successful open resets the backoff
    latest().open()
    latest().fire('close')
    vi.advanceTimersByTime(1000)
    expect(FakeSocket.instances).toHaveLength(5)
    release()
    vi.advanceTimersByTime(60_000)
    expect(FakeSocket.instances).toHaveLength(5) // no zombie reconnects
  })

  it('a throwing constructor reports failure instead of crashing', () => {
    let failed = false
    const conn = createRelayConnection('ws://relay', { onFrame: () => {}, onFail: () => (failed = true) }, {
      socketFactory: () => {
        throw new Error('no ws in this browser')
      }
    })
    conn.acquire()
    expect(failed).toBe(true)
    expect(conn.isOpen()).toBe(false)
    expect(conn.send({ type: 'x' })).toBe(false)
  })

  it('send() only fires on an open socket and reports it', () => {
    const conn = createRelayConnection('ws://relay', { onFrame: () => {} }, { socketFactory: factory })
    conn.acquire()
    expect(conn.send({ type: 'early' })).toBe(false) // still CONNECTING
    latest().open()
    expect(conn.send({ type: 'hello' })).toBe(true)
    expect(latest().sent).toEqual(['{"type":"hello"}'])
  })
})
