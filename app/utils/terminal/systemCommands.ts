import type { TerminalCommand, TerminalContext } from '~/utils/terminal/types'
import { createInfoCommands } from '~/utils/terminal/infoCommands'
import { createShellCommands } from '~/utils/terminal/shellCommands'
import { createFileWriteCommands } from '~/utils/terminal/fileWriteCommands'
import { createMiscCommands } from '~/utils/terminal/miscCommands'

// Shell housekeeping, file writing/editing and misc meta commands — assembled
// from per-domain modules, the same shape as the content and fun splits.

export function createSystemCommands(ctx: TerminalContext): Record<string, TerminalCommand> {
  return {
    ...createInfoCommands(ctx),
    ...createShellCommands(ctx),
    ...createFileWriteCommands(ctx),
    ...createMiscCommands(ctx)
  }
}
