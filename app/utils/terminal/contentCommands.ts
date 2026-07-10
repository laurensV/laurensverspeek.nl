import type { TerminalCommand, TerminalContext } from '~/utils/terminal/types'
import { createSiteCommands } from '~/utils/terminal/siteCommands'
import { createBrowseCommands } from '~/utils/terminal/browseCommands'
import { createFileCommands } from '~/utils/terminal/fileCommands'

// Commands about the site's content — assembled from per-domain modules,
// the same shape as the funCommands and systemCommands splits.

export function createContentCommands(ctx: TerminalContext): Record<string, TerminalCommand> {
  return {
    ...createSiteCommands(ctx),
    ...createBrowseCommands(ctx),
    ...createFileCommands(ctx)
  }
}
