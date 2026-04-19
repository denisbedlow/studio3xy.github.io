# Retro — 2026-04-19: Stack setup & CLAUDE.md overhaul

## What was done

### CLAUDE.md
- Rewrote CLAUDE.md from scratch: removed outdated Starlight references, added accurate project structure, build commands, and CI/CD details
- Replaced again with a purpose-driven version: added ownership rules (CSV tools), hard constraints, preferred patterns, and tone/intent section
- Removed Git Workflow section from CLAUDE.md — moved to memory instead (more appropriate for personal behavioral preferences)

### Stack additions
- Added **Svelte** integration (`@astrojs/svelte` + `svelte@5`) — enables interactive Svelte islands via `client:load`
- Added **Tailwind CSS v4** integration (`tailwindcss` + `@tailwindcss/vite`) — wired up via `@import "tailwindcss"` in `src/styles/global.css`

### Memory updates
- Updated `feedback_git_workflow` memory: Claude now asks for confirmation before every commit or push
- Added `feedback_dev_server_browser` memory: open dev server in Chrome, not the sidebar preview
- Added `feedback_retro_prompt` memory: after every commit, ask if user wants a session retro

### Misc
- Committed `src/content/docs/404.md` (was untracked)

## Commits
- `91746ee` — Update CLAUDE.md: accurate project structure, remove Starlight, add git workflow policy
- `ff7608d` — Add 404 page to docs collection
- `ca8100e` — Add Svelte and Tailwind CSS integrations
- `a283c8d` — Replace CLAUDE.md: purpose-driven guide with ownership rules and hard constraints
