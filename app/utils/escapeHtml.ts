/**
 * Escape text for interpolation into trusted-HTML strings (terminal lines,
 * feed content). Covers the four characters that matter in text + attribute
 * positions; single quotes are never used as attribute delimiters here.
 */
export const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
