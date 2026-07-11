---
title: A Vue watch dies when its component unmounts
date: 2026-07-12
tags: [vue, nuxt]
---

If you register a `watch` inside a composable's setup, Vue binds it to the
calling component's effect scope and disposes it on unmount. Guard it with a
module flag and it never comes back — your "persist on change" writer silently
stops. Run it in a detached `effectScope(true)` instead and it lives for the
whole app.
