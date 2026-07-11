---
title: vitest does not type-check your tests
date: 2026-07-10
tags: [typescript, ci]
---

`vitest run` executes tests but never type-checks them. A test with an implicit
`any`, or a `.mjs` that fails `checkJs`, passes locally and then breaks CI on a
separate `vue-tsc`/`tsc` step. Run the type-check steps too before you push.
