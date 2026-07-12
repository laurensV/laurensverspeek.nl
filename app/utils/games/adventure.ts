// A pocket text adventure: the site as a dungeon. The engine (`advCommand`)
// is a pure state → state function so the whole game is unit-testable; the
// GameHandle wrapper adds the line editor, frame rendering and saves.
//
// This module is a thin facade: the implementation is split into focused
// modules under ./adventure/ (types, room data, pure engine, GameHandle
// wrapper). Import from here to keep the public API stable.

export type { AdvState, AdvResult } from './adventure/types'
export { advCommand, initialAdvState } from './adventure/engine'
export { createAdventureGame } from './adventure/handle'
