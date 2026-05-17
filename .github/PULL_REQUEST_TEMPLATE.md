<!--
Thanks for contributing to HireShield! Please fill in the sections below.
Keep PRs small and focused. See CONTRIBUTING.md for conventions.
-->

## Summary

<!-- What does this PR do, in one or two sentences? -->

## Related issue

Closes #

## Type of change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that changes existing behavior)
- [ ] Docs / chore / tooling

## Checklist

- [ ] `pnpm run typecheck` passes
- [ ] If I changed `lib/api-spec/openapi.yaml`, I ran `pnpm --filter @workspace/api-spec run codegen` and committed the result
- [ ] I followed the "never accuse" principle — no new copy or heuristic delivers a verdict about a specific employer
- [ ] No `console.log` in server code (used `req.log` or the singleton `logger`)
- [ ] I updated `replit.md` if I changed architecture, env vars, or where things live
- [ ] I added or updated tests where it made sense

## Screenshots / output

<!-- For UI changes, paste before/after screenshots. For analyzer changes, paste a sample report. -->

## Notes for reviewers

<!-- Anything reviewers should pay extra attention to. -->
