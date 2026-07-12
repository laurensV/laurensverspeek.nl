// Types for the pocket text adventure. Kept in one place so the room data,
// the pure engine and the GameHandle wrapper share a single contract.

export interface AdvState {
  room: string
  inv: string[]
  flags: Record<string, boolean>
  moves: number
}

interface Exit {
  to: string
  lockedBy?: string // flag name that must be true to pass
  lockedText?: string
}

export interface Room {
  name: string
  desc: string
  exits: Partial<Record<'north' | 'south' | 'east' | 'west' | 'up' | 'down', Exit>>
  items: string[] // takeable things currently in the room (mutated via state.flags, see roomItems)
  fixtures?: string[] // things you can examine/talk to but not take
}

export interface Item {
  desc: string
  takeText?: string
  useText?: string
}

export interface AdvResult {
  lines: string[]
  state: AdvState
  done?: 'win' | 'dead' | 'quit'
}
