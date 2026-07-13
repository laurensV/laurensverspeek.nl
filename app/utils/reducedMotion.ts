/**
 * True when motion should be minimized — the single source of truth for every
 * JS/canvas animation gate on the site. It honours BOTH the OS
 * `prefers-reduced-motion` media query AND the site's own manual "reduce motion"
 * switch (which `useReduceMotion` stamps as `data-reduce-motion` on <html>). The
 * CSS blanket in global.scss already flattens declarative animations under that
 * attribute; this covers the imperative ones (matrix rain, the flow-field hero,
 * the visitor globe, count-ups, confetti, screensavers, fireworks, …) that read
 * a media query directly and would otherwise ignore the manual switch.
 *
 * Client-only; returns false during SSR (there is no motion to reduce there).
 */
export function prefersReducedMotion(): boolean {
  if (!import.meta.client) return false
  return document.documentElement.hasAttribute('data-reduce-motion')
    || window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
