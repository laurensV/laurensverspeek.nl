---
title: Array.slice(-0) returns the whole array
date: 2026-07-11
tags: [javascript]
---

`arr.slice(-n)` takes the last `n` items — except `-0 === 0`, so `slice(-0)`
returns *everything*. A `tail -0` that should print nothing prints the lot. Guard
`n === 0` explicitly before slicing from the end.
