---
title: 'giving my fake OS its own route'
date: '2026-07-08'
description: 'lvOS was a fixed overlay with a dead scrollbar and no shareable URL. moving it to /desktop fixed both — and taught me where overlays quietly lie.'
tags: ['nuxt', 'vue', 'lvos']
---

[lvOS](/blog/a-window-manager-in-a-div) — the pretend desktop hiding in this site — started life as an *overlay*. Type `desktop` in the terminal, a `useState` flag flips to `true`, and a `position: fixed` `<div>` slams over the whole page at `z-index: 95`. It worked. It also had two tells that it wasn't really a screen of its own.

## the dead scrollbar

The overlay covered the viewport, but the *page underneath it was still there* — hero, footer, all of it, taller than the screen. So the browser still showed a scrollbar. You could scroll a page you couldn't see, behind an OS that didn't move. A tiny thing, but it broke the illusion every time.

The honest fix isn't "hide the scrollbar." It's to stop having a tall page behind the desktop at all. That means the desktop shouldn't be an overlay on a page — it should *be* the page.

## overlay → route

So lvOS moved to a real route, `/desktop`, with a bare layout that renders nothing but the desktop:

```vue
<!-- layouts/desktop.vue -->
<template>
  <div class="lvos-shell"><slot /></div>
</template>
```

```vue
<!-- pages/desktop.vue -->
<template>
  <ClientOnly>
    <WebDesktop />
  </ClientOnly>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'desktop' })
useHead({ title: 'lvOS — Laurens Verspeek', htmlAttrs: { class: 'is-lvos' } })
</script>
```

No navbar, no footer, no background field — so there's no tall content to scroll. The `is-lvos` class on `<html>` locks it down for good:

```scss
html.is-lvos,
html.is-lvos body {
  overflow: hidden;
}
```

Scrollbar gone, because there's genuinely nothing to scroll.

## the flag becomes a URL

The nicest part is what *disappeared*. The old model needed a global `desktopActive` flag, a plugin to read `?desktop` from the query string, a watcher to lazy-mount the component, and `desktopActive.value = false` sprinkled through every "log out" and "open this project" handler. All of it existed to fake navigation.

Once `/desktop` is a real route, navigation is navigation:

```ts
// booting the desktop is now just... going there
const logout = () => router.push('/')
const openProject = (slug: string) => router.push(`/projects/${slug}`)
```

The terminal's `desktop` command, the command palette, and the footer link all `navigateTo('/desktop')`. The `?desktop` plugin got deleted. A whole piece of shared state evaporated, replaced by the router — which was always the right tool for "show a different screen."

And because it's a route, it's shareable: [laurensverspeek.nl/desktop](/desktop) boots you straight in. A taskbar button hands it to the real Fullscreen API for the full effect:

```ts
const { isFullscreen, toggle } = useFullscreen()
```

## the lesson

An overlay is a screen you're *pretending* is on top. Most of the time the pretense is free. But the moment the thing underneath can still scroll, or someone wants to link to it, the seams show. If a view is really its own place, give it its own route — the framework already knows how to get there.
