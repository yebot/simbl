# Changelog

Brief milestone history of SIMBL development.

## 2025-12-25

- **Centralized Logging**: Migrated from embedded task logs to `.simbl/log.ndjson` file with `simbl log` command supporting filtering by task, date range, and limit

## 2025-12-19

- **PicoCSS Confirmation Modals**: Replace browser-native confirms with styled PicoCSS dialogs for Archive/Cancel actions

## 2025-12-17

- **Task Log Feature**: Auto-generated activity logs for task mutations with web UI toggle to show/hide

## 2025-12-15

- **Project Management**: Full project CRUD in web UI task modal
- **Tag Autocomplete**: Autocomplete suggestions when adding tags
- **Favicons**: App icons and apple-touch-icon support
- **JSON Output**: `--json` flag support across CLI commands

## 2025-12-11

- **Priority Selection UI**: Visual priority picker in Add Task modal
- **Tag Cloud Fix**: Show all tags including `refined` in web UI

## 2025-12-09

- **Web UI Enhancements**: Cancel endpoint, status/priority filters, configurable port
- **Keyboard Shortcuts**: `n`, `p`, `/`, `j/k`, `Enter` for web UI navigation

## 2025-12-08

- **macOS Code Signing**: Build scripts now codesign binaries
- **Port Auto-retry**: Server automatically finds available port

## 2025-12-07

- **SIMBL Design System**: CSS variables, consistent styling, status workflow
- **Web UI Refactor**: Simplified task table, proper escaping

## 2025-12-06

- **Initial Release**: Core CLI with 8 implementation phases
  - Task CRUD operations
  - Markdown-based storage in `.simbl/tasks.md`
  - Tag system with priorities, relationships, status
  - Browser UI with HTMX and live WebSocket updates
  - Native macOS ARM/Intel binaries
