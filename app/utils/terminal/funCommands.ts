import type { TerminalCommand, TerminalContext } from '~/utils/terminal/types'
import { createGameCommands } from '~/utils/terminal/gameCommands'
import { createToyCommands } from '~/utils/terminal/toyCommands'
import { createNetCommands } from '~/utils/terminal/netCommands'
import { createEffectCommands } from '~/utils/terminal/effectCommands'

// Toys, games, net theater, effects and easter eggs — assembled from
// per-domain modules, the same shape as the systemCommands split.

export function createFunCommands(ctx: TerminalContext): Record<string, TerminalCommand> {
  return {
    ...createGameCommands(ctx),
    ...createToyCommands(ctx),
    ...createNetCommands(ctx),
    ...createEffectCommands(ctx)
  }
}
