# CLAUDE.md — studio3xy.github.io

## What this is
Personal site for Denis. Hosts small custom post-production tools, 
short videos, and documentation. Audience: me. Not a product.
Built with Astro, deployed to GitHub Pages via studio3xy.com.

## Stack
- **Framework**: Astro (islands architecture)
- **Interactivity**: Svelte components via Astro islands (`client:load`)
- **Styling**: Tailwind CSS — use utility classes only, no custom CSS 
  unless Tailwind genuinely can't do it
- **Deployment**: GitHub Pages (push to `main` = deploy)
- **Package manager**: npm

## Project structure
- `src/pages/` — routes (each `.astro` file = one page)
- `src/components/` — reusable UI components (`.svelte` for interactive, 
  `.astro` for static)
- `src/content/` — Markdown docs
- `public/` — static assets (videos, images)

## Sensitive files — explain before touching
- `astro.config.mjs` — affects the entire build pipeline
- `package.json` — no new dependencies without bundle impact check

## Ownership
- **CSV tools** — owned by Denis. Never modify, refactor, or touch 
  without explicit permission in the conversation.

## Preferred patterns
- **Error handling**: try/catch in every async operation. On failure, 
  log to console.error and display a visible inline error message in 
  the component — never fail silently. No external error service for now 
  (Sentry is a future option if silent failures become a problem).
- **Component naming**: PascalCase for components, kebab-case for pages
- **No abstraction until a pattern repeats 3+ times** — keep it simple first

## Hard rules
- Run `npx astro check` after every edit — type-checks .astro and .ts files
- Run `npm run build` before pushing — full build validation
- Never modify `astro.config.mjs` without explaining why
- Keep each component focused — one tool per file, no mega-components
- No new npm dependencies without explicit approval in the conversation —
  always propose first, wait for confirmation before installing
- New Svelte islands only when interactivity is genuinely needed — 
  prefer `.astro` for anything static

## Workflow
- Changes go straight to `main` — no staging, so verify locally 
  with `npm run dev` before pushing
- Videos live in `public/` and are served as static assets — 
  no external hosting unless file is >50MB

## Tone / intent
Personal toolbox, not a portfolio. Prioritize function and speed 
of iteration over polish. No analytics, cookie banners, or anything 
that assumes there's an audience.
