# Contributing

Thanks for taking a look. This is a personal portfolio project, but it follows the workflow
I'd use on a team.

## Setup

```bash
pnpm install
pnpm dev
```

Requirements: Node 26+ and pnpm 12+. No API keys and no backend — the dashboard runs on the
deterministic simulation engine.

## Before you push

CI runs exactly these; all must be green:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Ground rules

- **The engine stays framework-free.** Nothing in `src/engine/` may import React or Next. The
  dependency arrow points UI → engine only, which keeps the core unit-testable and lets the app
  export to static HTML.
- **Determinism.** Use the seeded RNG (`rng.ts`) — no `Math.random()` or bare `Date.now()` in
  engine logic a test can't control. The same seed must always produce the same fleet.
- **Insights must be grounded.** Every insight must reference a real computed figure or a real
  agent. If you add one, add a test that proves it can't fabricate a statistic — the eval asserts
  `invalidInsights === 0`.
- **Never fabricate eval numbers.** The README table is produced by `pnpm eval`. If behavior
  changes, re-run it and paste the real output.
- **Compose small components.** Prefer small presentational components over large pages, per the
  design.
- **Types over comments.** Prefer making an invalid state unrepresentable (string-literal unions
  for status/axes) to documenting that it shouldn't happen.

## Commit style

Small, focused commits with imperative subjects. One concern per commit.
