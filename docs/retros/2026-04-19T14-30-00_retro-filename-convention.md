# Retro — 2026-04-19T14-30-00: Retro filename convention

## What was done

### Session startup
- Added instruction to read the last two retros at the start of every session

### Retro filename convention
- Changed retro filename format from `YYYY-MM-DD_topic.md` to include timestamp
- Iterated through formats: `HHMM` → `HHMM` ISO (`T`) → `HH:MM:SS` → `HH-MM-SS` (hyphens, macOS colon limitation)
- Final format: `YYYY-MM-DDTHH-MM-SS_topic.md`
- Renamed existing retro: `2026-04-19_stack-setup-and-claude-md-overhaul.md` → `2026-04-19T13-10-00_stack-setup-and-claude-md-overhaul.md`

### Memory updates
- Updated `feedback_retro_prompt` memory: check CLAUDE.md for needed updates before writing each retro
- Updated `feedback_retro_prompt` memory: filename pattern updated to `YYYY-MM-DDTHH-MM-SS_topic.md`

## Commits
- `60bab81` — Rename retro file to ISO timestamp format with hyphenated time
