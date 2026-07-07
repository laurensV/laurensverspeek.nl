---
title: 'rebuilding my portfolio after 4 years of "coming soon(ish)"'
date: '2026-07-05'
description: 'from an unfinished nuxt 2 page to a nuxt 4 site with a terminal, games and too many easter eggs.'
tags: ['nuxt', 'vue', 'meta']
---

For four years, my personal website consisted of a hero, six project cards, and the sentence *"My personal slice of the web is still under construction and will be live if I can find some time to finish it ;)"*.

I never found the time. So instead of finishing v1, I deleted it.

## the stack

The rebuild is [Nuxt 4](https://nuxt.com) + TypeScript + [Bulma 1](https://bulma.io). Bulma might seem like an odd choice next to the utility-css crowd, but v1 moved everything to CSS variables, which makes theming almost free:

```scss
@use "bulma/sass" with (
  $family-primary: '"Inter", sans-serif',
  $family-code: '"JetBrains Mono", monospace',
  $primary: #ffba00
);
```

Dark mode is just `data-theme="dark"` on the `<html>` element — Bulma swaps every variable, and anything custom reads `var(--bulma-*)` so it follows along. Even the canvas animations read their colors from the CSS variables at runtime.

## the terminal

The gimmick I actually wanted to build: press `~` and you get a terminal. It's not an emulator — it's a Vue component and a composable with a command map:

```ts
const commands: Record<string, TerminalCommand> = {
  help:     { description: 'List available commands', exec: () => ... },
  projects: { description: 'List projects', exec: (args) => ... },
  cd:       { description: 'Go to a page', exec: (args) => navigate(args[0]) },
  // ...30 or so more
}
```

State lives in `useState` so the navbar button, the footer link and the overlay all talk to the same terminal. Commands can navigate the router, toggle the theme, fetch the GitHub API, or take over the keyboard entirely — which is how [snake ended up in there](/blog/snake-in-the-terminal).

## the easter eggs

I won't list them all (run `secrets`), but the rule I set myself: every easter egg has to be discoverable from a hint somewhere else. The console hints at the terminal, the terminal hints at the hidden commands, the hidden commands hint at... you get it.

If you find one that isn't hinted at anywhere, that's a bug. Or is it?
