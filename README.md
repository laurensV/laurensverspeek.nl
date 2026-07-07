# laurensverspeek.nl

Personal portfolio of Laurens Verspeek — built with [Nuxt 4](https://nuxt.com), TypeScript and [Bulma 1](https://bulma.io).

## Features

- **Terminal mode** — press <kbd>~</kbd> anywhere. `help` lists commands; `secrets` lists the hidden ones.
- **lvOS desktop** — run `desktop` (or `startx`) in the terminal for a full OS-style desktop with draggable windows, a taskbar and desktop icons. Inspired by [dustinbrett.com](https://dustinbrett.com).
- **Blog** — markdown posts via [Nuxt Content](https://content.nuxt.com) with Shiki syntax highlighting (`content/blog/*.md`).
- **Mini-games** — `snake` and `hangman`, playable inside the terminal (or via `snake.exe` on the lvOS desktop).
- **Easter eggs** — `matrix`, `crt`, `cowsay`, `figlet`, `fortune`, `sl`, a boot splash, and a note in the browser console.
- **Command palette** — <kbd>Ctrl</kbd>+<kbd>K</kbd> / <kbd>⌘K</kbd> fuzzy search over pages, posts, projects and actions.
- **Interactive 3D hero** — Three.js wireframe icosahedron: drag it to spin (with momentum), click it for a pulse.
- **IDE details** — `// comment`-style navigation, a VS Code-style status bar (yes, the Ln/Col moves), and a hand-highlighted `laurens.ts` on the About page.
- **Live GitHub stats** — stars/repos/followers fetched client-side with skeleton and error states.
- **CV** — `/cv` is print-optimized (forces light theme when printing).
- Dark/light theme, scroll reveals, page transitions, filterable projects with detail pages, `/uses`, SEO meta + sitemap.

## Development

```bash
npm install
npm run dev        # dev server on http://localhost:3000
npm run lint       # eslint
npm run typecheck  # vue-tsc
```

## Production

```bash
npm run generate   # static site in .output/public
npm run preview    # preview the production build
```

Deployed to GitHub Pages automatically on push to `master` (see `.github/workflows/deploy_gh-pages.yml`).

## Editing content

- Blog posts: `content/blog/*.md` (frontmatter: `title`, `date`, `description`, `tags`)
- Projects (incl. detail-page stories): `app/data/projects.ts`
- Bio, skills, timeline, socials: `app/data/profile.ts`
- Uses page: `app/data/uses.ts`
