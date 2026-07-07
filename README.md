# laurensverspeek.nl

Personal portfolio of Laurens Verspeek — built with [Nuxt 4](https://nuxt.com), TypeScript and [Bulma 1](https://bulma.io).

Features an interactive terminal mode (press <kbd>~</kbd>), an animated particle-network background, dark/light themes and a filterable project showcase.

## Development

```bash
npm install
npm run dev        # dev server on http://localhost:3000
```

## Production

```bash
npm run generate   # static site in .output/public
npm run preview    # preview the production build
```

Deployed to GitHub Pages automatically on push to `master` (see `.github/workflows/deploy_gh-pages.yml`).

## Editing content

- Projects: `app/data/projects.ts`
- Bio, skills, timeline, socials: `app/data/profile.ts`
