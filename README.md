# laurensverspeek.nl

Personal portfolio of Laurens Verspeek — built with [Nuxt 4](https://nuxt.com), TypeScript and [Bulma 1](https://bulma.io).

A minimalist developer portfolio on the surface, with an unusual amount hidden a keystroke away.

## The terminal

Press <kbd>~</kbd> (or <kbd>`</kbd>) anywhere to open the interactive shell. It is the centerpiece — a real command interpreter shared by the navbar, footer and the lvOS desktop.

- **Navigate & read** — `about`, `projects`, `blog`, `now`, `uses`, `cv`, `contact`, `github`, `stats`, `changelog`, `search <term>` (full-text over blog posts), `open <thing>`.
- **A persistent virtual filesystem** — `ls`, `cd` (incl. `cd -`, `pushd`/`popd`), `pwd`, `tree`, `cat`, `mkdir`, `touch`, `rm`, `cp`, `mv` — with `*` wildcards, and it survives across visits. Edit files with the real **`nano`** and modal **`vim`**/`vi`.
- **Pipes & redirection** — `help | grep blog | sort | uniq | wc`, `… > file`, `… >> file`, and `… | copy` to the clipboard.
- **Shell niceties** — history (<kbd>↑</kbd>/<kbd>↓</kbd>, <kbd>Ctrl</kbd>+<kbd>R</kbd> reverse search, `!!`/`!n`/`!prefix` expansion), `alias`/`export` (persisted), tab completion, `man`, `which`, `fontsize` (or <kbd>Ctrl</kbd>+<kbd>=</kbd>/<kbd>-</kbd>), grouped `help`.
- **`git`** — replays this repo's real commit history (`git log`, `git show <sha>`), baked at build time. Also surfaced at `/changelog`.
- **Toys & effects** — `cowsay`, `figlet`, `fortune`, `weather [city]`, `qr [text]`, `matrix`, `crt`, `sl`, `party`, `sysinfo`, `df`/`du`, `ps`/`kill` (the effects are real processes you can kill), `asciicam` (webcam → ASCII).
- **Games** — `snake`, `tetris` (with hold + ghost), `2048`, `pong`, `hangman`, `wpm` typing test, `top`, Conway's `life`.
- **Hidden ones** — `secrets` lists them. Includes `ssh`, `sudo`, `do a barrel roll`, `destroy` (a ship that shoots the actual DOM to bits; <kbd>Esc</kbd> repairs it), and `say` (a speech bubble on your live cursor).

## lvOS — a desktop in a route

Run `desktop` / `startx`, or visit `/desktop`. A BIOS boot, then a windowing environment: draggable/resizable windows with edge & corner snapping, <kbd>Alt</kbd>+<kbd>Tab</kbd>, a taskbar with peek previews, a start menu, notifications, a genie minimize, right-click menus (with pin-on-top), a lock screen, shutdown/reboot with a CRT power-off, live wallpapers, and a <kbd>?</kbd> shortcut sheet. Apps include a terminal, file explorer (over the same VFS), blog reader, browser, paint, notes, calculator, clock, Minesweeper, Game of Life, snake, an image gallery, a task manager (kill a window like a process), settings and vim.

## The rest of the site

- **Blog** — markdown via [Nuxt Content](https://content.nuxt.com) with Shiki highlighting, TOC + scrollspy, reading time, copy buttons, deep-link anchors, called-out lines, related posts, clickable hue-coded tags with shareable `?tag=` filters, a full-content RSS feed, and Web Share.
- **Vim-style navigation** — <kbd>j</kbd>/<kbd>k</kbd> scroll, <kbd>gg</kbd>/<kbd>G</kbd> jump, `gh`/`gb`/`gp` go to home/blog/projects.
- **Command palette** — <kbd>Ctrl</kbd>+<kbd>K</kbd> / <kbd>⌘K</kbd> fuzzy search over pages, posts, projects and actions.
- **Details** — an interactive Game of Life hero (with a pointer trail), a working VS Code-style status bar, `pwd` breadcrumbs, a time-aware greeting, theme-aware favicon, an interactive 404 recovery shell (with a hidden `play`), a downloadable vCard + ASCII QR on `/contact`, live GitHub stats that count up, print-optimized `/cv`, `humans.txt` + `security.txt`, breadcrumb & article JSON-LD, an offline PWA fallback, and git-derived "last updated" dates.
- Dark/light theme throughout, reduced-motion respected everywhere, filterable projects with detail pages, `/uses` and `/now`.

## Development

```bash
npm install
npm run dev              # dev server on http://localhost:3000
npm run lint             # eslint
npm run typecheck        # vue-tsc over the app
npm run typecheck:tests  # vue-tsc over tests/
npm run test             # vitest unit tests
npm run test:e2e         # playwright (needs `npm run generate` first)
npm run knip             # unused files / exports / deps
```

A pre-commit hook runs eslint on staged files (husky + lint-staged).

## Production

```bash
npm run generate   # static site in .output/public
npm run preview    # preview the production build
```

Deployed to GitHub Pages automatically on push to `main`; pull requests run the full check suite without deploying (see `.github/workflows/deploy_gh-pages.yml`).

## Optional integrations

Both are **off by default** and activate via environment variables at build time:

- **Analytics** (privacy-first, no cookies): create a free [GoatCounter](https://www.goatcounter.com) account and set
  `NUXT_PUBLIC_GOATCOUNTER=<your-code>` (or the `GOATCOUNTER_CODE` repo variable, which CI passes through). Enables page
  views, anonymous terminal-command usage events, and the terminal `stats` command.
- **Live visitor cursors**: deploy the tiny relay in `realtime/cursors-server.mjs` to any Node host
  (`node realtime/cursors-server.mjs`, no state, no storage) and set `NUXT_PUBLIC_CURSORS_WS=wss://your-host`. Only
  anonymous viewport positions are relayed. Unlocks the "N browsing" badge (click it to toggle other cursors) and `say`.

## Editing content

- Blog posts: `content/blog/*.md` (frontmatter: `title`, `date`, `description`, `tags`)
- Projects (incl. detail-page stories): `app/data/projects.ts`
- Bio, skills, timeline, socials: `app/data/profile.ts`
- Uses page: `app/data/uses.ts`
