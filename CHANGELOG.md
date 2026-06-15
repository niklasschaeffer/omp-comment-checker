# Changelog

## [0.2.0] - 2026-06-15

### Changed

- Retargeted at `@oh-my-pi/pi-coding-agent` (oh-my-pi, `can1357/oh-my-pi`).
  Package renamed to `omp-comment-checker`. `@oh-my-pi/pi-coding-agent` and
  the original `@mariozechner/pi-coding-agent` peer deps are both optional
  and detected at load time; the extension works under either runtime.
- Renamed the slash command to `/omp-comment-checker`.
- Widget is now visible in `warning` state under omp (lists offending
  files and preview lines), hidden under pi.
- Footer `setStatus` line surfaces the warning count under omp; no-op under pi.

### Added

- Omp edit-tool `details.perFileResults` support in `extractCommentCheckRequests`.
  Omp's `edit` tool runs in `hashline`, `patch`, `replace`, and
  `apply_patch` modes; all four are now extracted uniformly through
  `extractFromOmpEditDetails`.
- Self-heal loop: when a checker warning fires, the record is appended
  to the session via `pi.appendEntry("omp-comment-checker:warning", …)`.
  On the next `session_compact` event, any unfired warnings are
  re-injected as a `pi.sendMessage` custom message so the next LLM
  turn sees them in context. The store is cleared on `session_start`.
- `src/omp.ts` — `createOmpBackend(pi)` probes for omp-only API surface
  (`appendEntry`, `sendMessage`, `session_compact` listener,
  `ctx.ui.setStatus`) and returns an `OmpBackend` whose methods are
  no-ops on plain pi.
- `src/self-heal.ts` — `SelfHealStore` keyed by stable UUIDs.

### Fixed

- None.

## [0.1.0] - 2026-05-15

### Added

- Initial standalone `pi-comment-checker` extension.
- Post-mutation checks for `write`, `edit`, `multiedit`, and `apply_patch`.
- OMO-compatible `apply_patch` metadata support using `before` / `after` file content.
- Raw Codex patch fallback parsing for `apply_patch`.
- Above-editor TUI widget for loading, missing-binary, warning, and error states.
- `/comment-checker` status command.
