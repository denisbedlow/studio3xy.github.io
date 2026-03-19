# Studio3xy — Claude Code Guide

## Project Overview
Static documentation/tools site built with **Astro + Starlight**, deployed to GitHub Pages at `https://studio3xy.com`.

## Tech Stack
- **Framework**: Astro 6 with Starlight integration
- **Language**: TypeScript
- **Styling**: Custom CSS at `src/styles/custom.css`
- **Deploy**: GitHub Actions → GitHub Pages (on push to `main`)

## Build & Dev Commands
```bash
npm run dev       # Start dev server (localhost:4321)
npm run build     # Production build → dist/
npm run preview   # Preview production build locally
npx astro check  # TypeScript type-check (also runs in CI)
```

## Project Structure
```
src/
  content/docs/   # Markdown/MDX pages (Starlight content collection)
  content.config.ts
  pages/          # Non-docs Astro pages
  styles/custom.css
public/           # Static assets served as-is
  blink-counter.html / blink-counter.js
  eye-tracking.html / eye-tracking.js
  favicon.svg
astro.config.mjs  # Site config, sidebar nav, integrations
```

## Content
Add new docs pages as `.md` or `.mdx` files under `src/content/docs/`. Register them in the `sidebar` array in `astro.config.mjs`.

## CI/CD
`.github/workflows/deploy.yml` runs on every push to `main`:
1. `npm ci`
2. `npx astro check` (type errors fail the build)
3. `npm run build`
4. Deploys `dist/` to GitHub Pages

## Notes
- `public/CNAME` sets the custom domain (`studio3xy.com`)
- Files with ` 2` suffix in `public/` and `src/` are duplicates — clean these up before shipping new content
- No test suite currently configured
