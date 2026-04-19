# Studio3xy — Claude Code Guide

## Project Overview
Static documentation/tools site built with **Astro 6** (no Starlight — custom layouts), deployed to GitHub Pages at `https://studio3xy.com`.

## Tech Stack
- **Framework**: Astro 6 with MDX integration
- **Search**: Pagefind (built post-`astro build`, excluded from Vite bundling)
- **Language**: TypeScript (strict)
- **Styling**: `src/styles/global.css` + `src/styles/custom.css`
- **Deploy**: GitHub Actions → GitHub Pages (on push to `main`)

## Build & Dev Commands
```bash
npm run dev       # Start dev server (localhost:4321)
npm run build     # astro build && pagefind --site dist
npm run preview   # Preview production build locally
npx astro check  # TypeScript type-check (also runs in CI)
```

## Project Structure
```
src/
  components/         # Shared UI components
    AppHeader.astro
    LeftNav.astro / PageSidebar.astro / RightToc.astro
    Search.astro       # Pagefind integration (is:inline import)
    ThemeToggle.astro
    CsvDecomposer.astro / CsvMstAppender.astro / CsvRuleSplitter.astro
    EdlConverter.astro
  layouts/
    BaseLayout.astro   # Root wrapper
    DocsLayout.astro   # Docs pages wrapper
  content/docs/        # Markdown/MDX pages (content collection)
    index.md
    eyetracking/index.mdx
    tools/             # csv-decomposer, csv-mst-appender, csv-rule-splitter, edl-converter
    video/index.mdx
  content.config.ts    # glob loader, Zod schema (title required, description optional)
  pages/
    [...slug].astro    # Dynamic routing for docs collection
    404.astro
  styles/
    global.css
    custom.css
  env.d.ts
public/
  CNAME              # Custom domain (studio3xy.com)
  favicon.svg
  styles.css
  blink-counter.html / blink-counter.js
  eye-tracking.html / eye-tracking.js
astro.config.mjs      # Site URL, MDX, Vite pagefind external config
```

## Content
Add new docs pages as `.md` or `.mdx` files under `src/content/docs/`. No sidebar config needed — routing is dynamic via `[...slug].astro`.

## Navigation
The sidebar is rendered by `LeftNav.astro` / `PageSidebar.astro` — update those components to add new nav entries, not `astro.config.mjs`.

## Git Workflow
Always ask for confirmation before committing or pushing changes.

## CI/CD
`.github/workflows/deploy.yml` runs on push to `main`:
1. Node 22, `npm ci`
2. `npx astro check` (type errors fail the build)
3. `npm run build` (includes pagefind indexing)
4. Deploys `dist/` to GitHub Pages via `actions/deploy-pages@v4`

## Notes
- No test suite configured
- `public/styles.css` is a static stylesheet separate from src styles — keep in sync if overriding
