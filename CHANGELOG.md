# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- Runtime and toolchain: Node 20 -> 26 (Active LTS), pnpm 9 -> 12, GitHub Actions on current
  majors.
- Frameworks and libraries: Next.js 15 -> 16, React 19.3, TypeScript 5.9 -> 6.0, ESLint 9 -> 10,
  typescript-eslint 8.72, Vitest 3 -> 5 (on Vite 8), Zod 3 -> 4, React Flow 12.12.
- Transitive dependencies refreshed so the high-severity audit gate passes again.

## [0.1.0] - 2026-09-07

First public release.

### Added
- Deterministic, framework-free engine (`src/engine`), fully unit-tested:
  - Seeded simulation engine generating a diverse fleet with correlated metrics, 24-hour
    time-series, and a live activity feed.
  - Metrics aggregator: hero metrics, fleet health score, weekly cost, and attention flags.
  - Comparison engine: six normalized axes (cost/latency inverted), per-axis ranks, an overall
    winner, and "best for X" recommendations.
  - Grounded insights generator producing natural-language observations from real figures.
  - Rule-based intent parser + apply for the intent-first top bar.
  - Shared-tool relationship map builder.
  - Evaluation harness and `pnpm eval` CLI (0 ungrounded insights; reproducibility asserted).
- Next.js dashboard with five views — Overview, Registry, Agent detail, Comparison cockpit
  (radar + side-by-side + trade-off insights), and a React Flow agent map — plus an intent bar.
- Dark-first design system with soft glass, layered depth, and calm accents; hand-rolled inline
  SVG sparklines and a multi-series radar (no chart dependency).
- 31 Vitest tests across simulation, aggregation, comparison, intent, insights, and the map.
- Static client-side export deployed to GitHub Pages, Docker build, GitHub Actions CI (lint /
  typecheck / test / eval / build, plus a dependency audit), and full docs.

[0.1.0]: https://github.com/parag-labs/agentforge-dashboard/releases/tag/v0.1.0
