# Security & data

AgentForge Dashboard is a client-side dashboard over a deterministic simulation. It makes no
network calls, uses no API keys, and processes no real user data in the demo — so its security
surface is small by design. This document records the decisions that keep it that way.

## No secrets, no backend

- The entire dashboard runs in the browser on data produced by the seeded simulation engine.
- There are **no API keys**, no database, and no outbound requests in the demo build.
- The static GitHub Pages export contains only public, generated sample data.

## Grounded insights (no fabrication)

The "generative insights" panel is template-driven over real computed figures, not a language
model. An insight is only emitted when its condition holds (e.g. an agent exceeds 1.5× the fleet
median cost), and it prints the actual numbers. The evaluation harness asserts
`invalidInsights === 0` — every insight references a real agent or a real figure. This is the
security-relevant property of a metrics dashboard: it must not present a statistic it can't back
up.

## Determinism

The simulation, comparison, insights, and intent parsing are all pure and seeded. The same seed
always yields the same fleet, and the eval asserts reproducibility. There is no `Math.random()`
in the engine, so behavior can't drift between environments.

## When real telemetry is connected

The UI depends only on the engine's types, so a real deployment would add a data provider behind
those types. At that point the standard controls apply and are out of scope for this reference
build:

- authentication and per-user authorization for agent data;
- transport security (HTTPS) and secret management for the telemetry backend;
- input validation on any agent-supplied metadata (the domain types already have Zod schemas to
  build on);
- rate limiting and audit logging.

## Reporting

This is a personal portfolio project. If you find a security issue, please open an issue
describing it.
