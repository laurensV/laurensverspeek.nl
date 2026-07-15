---
title: 'stop rebasing the past: merge vs rebase without lying to history'
date: '2026-07-15'
description: 'interactive rebase is a scalpel. integration rebase is time travel. the merge strategy I settled on, and why I want history to stay a record rather than a story.'
tags: ['git', 'workflow']
---

Every dev team has this argument sooner or later.

Someone wants a clean, linear history and reaches for rebase. Someone else insists rewriting history is dangerous and pushes for merge.

Both sides have a point — and they usually talk past each other, because "rebase" and "merge" mean different things in different contexts. The result is either a rigid rule nobody can fully explain ("we always rebase") or a free-for-all where the same repository ends up with three strategies and no one is quite sure what the history actually represents.

And it matters. That history is how you revert a bad release, track down a regression with `git bisect`, or explain to a colleague why a change landed the way it did. If the graph looks tidy but the commits no longer match what was ever built or tested, you've traded clarity for a story that's easier to read and harder to trust.

I've worked with merge-heavy, rebase-heavy and squash-heavy workflows. This post is the position I've settled on — not the only valid one, but one that keeps history accurate while still allowing clean branches:

- Clean your branch locally with **interactive rebase**.
- Don't rewrite integration history with **rebase onto main**.
- Keep feature boundaries explicit with **`--no-ff` merges**.
- Use **squash merges** sparingly — only if the branch will be deleted afterwards.

The rest of this explains why, and how to get there without the usual holy war.

## there are two kinds of rebase

Most Git debates fall apart because "rebase" gets treated as one thing. It isn't. There are two fundamentally different uses, and almost every disagreement is really about which one someone has in mind.

### 1. interactive rebase (commit cleanup)

```bash
git rebase -i origin/main
```

Reword commits, squash fixups, reorder changes, clean up your branch. This edits the shape of your branch **without changing its base** — you're polishing your own history before sharing it.

The rule: only do this before the branch is shared. Rewriting unpublished history is safe. Rewriting shared history is not.

> Interactive rebase is a cleanup tool — not an integration strategy.

### 2. integration rebase (rebasing onto main)

```bash
git fetch origin
git rebase origin/main
```

This replays your commits on top of a new base. If conflicts occur, you resolve them *while* replaying history. That can produce commits which:

- never existed in that form,
- were never developed against that base,
- and contain conflict resolutions baked into rewritten commits.

Afterwards, history claims: *"these commits were developed on top of this base."* But they weren't. It's a cleaner story, not a literal record. `git bisect` can land on a commit that never truly existed — so "the bug was introduced here" may point at a synthetic state.

## seeing the difference

A `--no-ff` merge keeps the feature branch as it was:

```
main:     A---B-------M
               \     /
                C---D   (feature)
```

C and D remain exactly as developed, M marks the integration point, and the history reflects reality.

An integration rebase rewrites them. Before:

```
main:     A---B
feature:       C---D
```

After `git rebase main`:

```
main:     A---B---C'---D'
```

C and D became C' and D'. Conflict resolutions may be embedded in them, and history now implies they were developed on top of B.

Interactive rebase looks superficially similar but does something else entirely. Before:

```
A---B---C---D---E
```

After `git rebase -i` (squashing D and E into C):

```
A---B---C'
```

No base change, no upstream integration — just cleanup. That's history *editing*, not integration *rewriting*.

## the strategies, compared

| Strategy | What it does | Pros | Cons |
|---|---|---|---|
| Fast-forward merge | Moves the branch pointer forward | Clean linear history | Loses the feature boundary |
| Merge `--no-ff` | Creates an explicit merge commit | Clear feature grouping, easy revert | Extra merge commits |
| Rebase and merge | Rewrites the branch onto main, then fast-forwards | Linear history, no merge commits | Rewrites integration history |
| Squash merge | Collapses the branch into one commit | Very clean main | Original commits not marked merged |

Note that interactive rebase isn't in the table. It's not an integration strategy — it's a local cleanup tool used *before* integration.

## but what about a clean linear history?

The main argument for integration rebasing is that linear history is easier to read. Visually, this:

```
A---B---C---D---E
```

is simpler than this:

```
A---B-------M
     \     /
      C---D
```

No branches, no merge commits, just a straight line. Some teams happily take that trade: a single line of commits is easier to scan, especially if they rarely inspect individual commits or use bisect.

But linear history has a cost. Feature boundaries disappear. Integration points vanish. Commits get rewritten to fit a base they weren't developed on, and conflict resolutions get baked into them.

Linear history optimizes for visual simplicity. Merge history optimizes for structural clarity and historical accuracy. If you live in the GitHub or GitLab UI, topology may not matter much. If you explore history via Git itself, debug regressions, or analyze how an architecture moved over time, it matters a lot. You have to choose what you value.

## why I prefer `--no-ff`

If features always go through merge requests and never directly into `main`, then:

```bash
git merge --no-ff feature-branch
```

produces:

```
*   Merge branch 'feature-x'
|\
| * commit 3
| * commit 2
| * commit 1
|/
* previous main
```

Clear feature grouping, real integration markers, easy feature-level reverts, and a graph that reflects how the work actually happened. Merge commits become the table of contents of your history.

Fast-forward, by contrast, removes the branch boundary entirely — you lose the grouping, the integration moment, and any structure in `git log --graph`.

## squash: simplifying at the cost of history

Squash turns a branch into one commit — `A---B---C` becomes `A---S`. It's useful for small features, noisy branches, and cases where the intermediate history genuinely doesn't matter.

But Git does not mark the original commits as merged. The feature branch still contains its history, future merges from it get confusing, and you lose commit-level visibility in `main`. So: only squash if you delete the feature branch immediately, locally and remotely.

Squash isn't more powerful than interactive rebase. It's just collapsing, done at integration time.

## keeping history clean anyway

If you use `--no-ff`, messy commits will land in `main` unless you do something about it. Three options, best used together:

**Clean before sharing.** `git rebase -i origin/main` — squash, reword, refine — before you push.

**Make merge commits the curated layer.** Write merge messages that carry the story:

```
feat: add billing dashboard (MR !1234)

- Invoice overview
- Filtering
- New API endpoint
```

**Enforce commit discipline.** No "fix" commits, no "wip" commits, meaningful messages. Cultural, but effective.

## catching conflicts without rebasing

You don't need integration rebase to stay up to date:

```bash
git fetch origin
git merge origin/main
```

Do this **before opening or updating your pull request**, so the merge result is what gets reviewed and tested. It surfaces conflicts early, preserves real integration states, and rewrites nothing. Require CI on updated branches or merge results and you get the safety without the rewriting.

Both GitHub and GitLab can enforce this: require merge commits (disable "squash and merge" or "rebase and merge" if you prefer), and protect `main` so force-pushes are blocked.

## the workflow I recommend

1. No direct pushes to `main`.
2. Use merge requests.
3. Prefer `--no-ff`.
4. Use interactive rebase only before sharing.
5. Avoid integration rebasing onto `main`.
6. Only squash if you're deleting the branch.
7. Require CI on merge results.

That preserves clarity without rewriting the past.

## final thoughts

> Interactive rebase is a scalpel. Integration rebase is time travel.

One cleans up your work. The other rewrites how it appears to have happened.

Plenty of experienced engineers prefer rebasing, and there are smart teams on both sides. For me the deciding factor is simple: I value structural clarity and historical accuracy over visual linearity. That's a trade-off, not a universal rule. If your team prefers a linear history and accepts rewriting integration commits, that can work — as long as you understand what it costs.

So I'm curious: do you optimize for a straight line, or for a faithful record of how things evolved?

**Further reading:** [Git — Branching and Merging](https://git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging) and [Git — Rebasing](https://git-scm.com/book/en/v2/Git-Branching-Rebasing) in the official Git documentation.
