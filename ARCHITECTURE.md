# Architecture

AgentForge Dashboard has two halves separated by a hard boundary:

1. **A pure-TypeScript engine** (`src/engine/`) with no React imports — the simulation engine,
   metrics aggregator, comparison engine, insights generator, intent parser, and relationship
   map. This is the tested, deterministic core.
2. **A thin Next.js UI** (`src/app`, `src/components`) that renders the engine's output. It runs
   entirely client-side, which is why the whole dashboard ships as a static GitHub Pages demo.

## Why a simulation engine

The LLD asks for a dashboard that "never feels empty or static" and is demoable from GitHub with
no real LLM calls. So the heart of the project is a **seeded simulation engine**: given a seed,
it deterministically generates a diverse fleet of agents, each with correlated metrics (an agent
in `error` status costs more and succeeds less) and a 24-hour time-series, plus a live activity
feed. Determinism matters twice over — the demo looks the same every load, and the tests/eval
are reproducible.

## Modules

| Module | Responsibility |
|--------|----------------|
| `rng.ts` | A seeded mulberry32 PRNG and helpers (no `Math.random()` anywhere). |
| `types.ts` | The domain model: `Agent`, `AgentMetrics`, `MetricSeries`, `ActivityEvent`, `AgentRecord`. |
| `simulation.ts` | `generateFleet(seed, n)` and `generateActivity()` — the living data. |
| `aggregate.ts` | `summarize()` (hero metrics), `fleetHealthScore()`, `weeklyCost()`, `needsAttention()`. |
| `compare.ts` | `compare(records)` — normalized axes, per-axis ranks, overall winner, best-for. |
| `insights.ts` | `fleetInsights()` / `comparisonInsights()` — grounded natural-language observations. |
| `intent.ts` | `parseIntent()` / `applyIntent()` — the intent-first top bar. |
| `map.ts` | `buildMap()` — the shared-tool relationship graph. |

## The comparison engine (the differentiator)

`compare(records)` requires 2–6 agents and computes, for each of six axes:

1. the raw value per agent (`successRate`, `p95LatencyMs`, `costPerRun`, `qualityScore`,
   `trustScore`, `tokensPerRun`);
2. a **min-max normalized score in 0..1 where higher is always better** — cost, latency, and
   token count are *inverted* first, so a cheaper/faster/leaner agent scores higher;
3. a per-axis ranking and the axis winner;

then a mean normalized score per agent (the overall winner) and a "best for `<axis>`" map. All
of it is pure and deterministic, so the radar and the side-by-side table are exact.

## Grounded insights

The "generative insights" panel is template-driven over **real computed numbers**, not a model.
For example, the most-expensive-agent insight is only emitted when an agent's weekly cost
exceeds 1.5× the fleet median, and it prints the actual multiplier and dollar figures. The eval
harness checks that every insight references a real agent name or a real figure — the
`invalidInsights` metric is asserted to be 0. This keeps the "generative" feel while guaranteeing
the panel can't fabricate a statistic.

## Intent parsing

`parseIntent(text)` is a deterministic, rule-based parser (the LLD explicitly allows
"rule-based + optional on-device LLM"). It recognizes status words, attention/risk phrasing,
cost/latency/quality sort intents, and a keyword (capability/tag/tool), and returns a structured
`Intent` plus a human-readable summary. `applyIntent(intent, fleet)` filters and sorts the fleet
accordingly. It always returns something usable, even for gibberish.

## UI composition

The LLD asks for "composition of small, well-designed components over large monolithic pages".
The UI is a single client `Dashboard` that switches between five views (Overview, Registry,
Detail, Comparison, Map) with small presentational components (`AgentCard`, `Metric`,
`InsightRow`, `ChartRow`, `Radar`, `Sparkline`). Charts are hand-rolled inline SVG so there is no
chart dependency; the agent map uses React Flow. The whole thing is client-side, which is what
lets it export to static HTML for GitHub Pages.

## Design system

Dark-first, expressed entirely in `globals.css`: soft glass (`backdrop-filter: blur` panels with
low-opacity borders), layered depth (three shadow tiers, hover lift), and calm accents (a violet
primary, a cyan secondary, and semantic success/warn/error). React Flow's default light node
style is overridden with higher-specificity selectors so nodes stay readable on the dark canvas.

## Keeping the path to real telemetry open

Because the UI depends only on the engine's types (`AgentRecord`, `AgentMetrics`, …), swapping
the simulation for a real telemetry source means implementing a data provider that returns those
same types — no UI or comparison-logic changes required. That seam is deliberate.
