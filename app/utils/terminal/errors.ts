// One shape for terminal error messages: `<source>: <message>`, the way real
// shell tools report. Shell-level failures (unknown command, etc.) use the
// `lvsh` source; individual commands pass their own name.

export function cmdError(source: string, message: string): string {
  return `${source}: ${message}`
}

/** Shell-level error, prefixed `lvsh:`. */
export function shellError(message: string): string {
  return cmdError('lvsh', message)
}
