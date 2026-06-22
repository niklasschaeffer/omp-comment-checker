## Summary

<!-- Brief description, 1-3 bullets -->

-

## Verification

- [ ] `npm run check` (typecheck + biome)
- [ ] `npm test` (unit tests)
- [ ] `npm pack --dry-run` (release sanity)
- [ ] `pi -e ./src/index.ts` smoke-tested locally, if behavior changed
- [ ] `senpi -e ./src/index.ts` smoke-tested locally, if behavior changed

## comment-checker impact

- [ ] `write`, `edit`, `multiedit`, and `apply_patch` paths remain covered by tests
- [ ] OMO-compatible `apply_patch` metadata support remains covered by tests
- [ ] CHANGELOG entry added for user-facing changes
