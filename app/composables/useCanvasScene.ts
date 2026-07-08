import { usePreferredReducedMotion, useDocumentVisibility, useResizeObserver } from '@vueuse/core'
import type { Ref } from 'vue'

// Boilerplate shared by the container-sized canvas scenes (the hero Game of
// Life and the /life page): device-pixel-ratio scaling, a ResizeObserver, a
// requestAnimationFrame loop that pauses when the tab is hidden or the user
// prefers reduced motion, and tidy mount/unmount.

export interface CanvasScene {
  /** (Re)size: allocate buffers, seed, and draw a first frame. Also re-run on redraw(). */
  onResize: (ctx: CanvasRenderingContext2D, width: number, height: number) => void
  /** Per animation frame (skipped under reduced motion or when hidden). */
  onFrame?: (ctx: CanvasRenderingContext2D, dt: number) => void
}

export interface CanvasSceneOptions {
  // ambient scenes (the hero) respect prefers-reduced-motion and stay still;
  // interactive tools (/life, the lvOS app) set this true and gate motion via
  // their own play/pause, so the loop is user-initiated, not ambient.
  alwaysAnimate?: boolean
  // false lets the caller drive start()/stop() (e.g. the matrix overlay, which
  // only animates while it's on screen). Defaults to true.
  autoStart?: boolean
}

export function useCanvasScene(
  canvasRef: Ref<HTMLCanvasElement | undefined>,
  containerRef: Ref<HTMLElement | undefined>,
  scene: CanvasScene,
  options: CanvasSceneOptions = {}
) {
  const reducedMotion = usePreferredReducedMotion()
  const visibility = useDocumentVisibility()
  let ctx: CanvasRenderingContext2D | null = null
  let rafId = 0
  let last = 0

  const fit = () => {
    const container = containerRef.value
    const canvas = canvasRef.value
    if (!container || !canvas) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = container.clientWidth
    const h = container.clientHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx = canvas.getContext('2d')
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
    if (ctx) scene.onResize(ctx, w, h)
  }

  const loop = (t: number) => {
    const dt = t - last
    last = t
    if (ctx && scene.onFrame) scene.onFrame(ctx, dt)
    rafId = requestAnimationFrame(loop)
  }

  const start = () => {
    cancelAnimationFrame(rafId)
    if (!scene.onFrame || visibility.value !== 'visible') return
    if (!options.alwaysAnimate && reducedMotion.value === 'reduce') return
    last = performance.now()
    rafId = requestAnimationFrame(loop)
  }
  const stop = () => cancelAnimationFrame(rafId)

  onMounted(() => {
    fit()
    if (options.autoStart !== false) start()
  })
  onBeforeUnmount(stop)
  useResizeObserver(containerRef, fit)
  watch([visibility, reducedMotion], start)

  // redraw() re-fits + re-invokes onResize (e.g. after a theme change), leaving
  // the animation loop untouched
  return { redraw: fit, start, stop }
}
