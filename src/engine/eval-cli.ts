/**
 * `pnpm eval` entry point. Runs the deterministic engine and prints a table of metrics derived
 * from real runs - never hand-typed. The README copies these numbers verbatim.
 */

import { evaluate } from "./evaluate";

function main(): void {
  const r = evaluate();

  console.log("\nAgentForge Dashboard Evaluation (metrics from actual runs)\n");
  const rows: Array<[string, string]> = [
    ["Agents simulated", String(r.agents)],
    ["Activity events", String(r.activityEvents)],
    ["Avg success rate", `${r.avgSuccessPct}%`],
    ["Fleet health score", `${r.healthScore}/100`],
    ["Comparison winner (top 4)", r.comparisonWinner],
    ["Fleet insights", String(r.fleetInsights)],
    ["Comparison insights", String(r.comparisonInsights)],
    ["Invalid (ungrounded) insights", String(r.invalidInsights)],
    ["Agent-map edges", String(r.mapEdges)],
    ["Simulation reproducible", r.simulationReproducible ? "yes" : "no"],
    ["Intent reproducible", r.intentReproducible ? "yes" : "no"],
  ];
  const w = Math.max(...rows.map(([k]) => k.length));
  for (const [k, v] of rows) console.log(`${k.padEnd(w)}  ${v}`);

  if (r.invalidInsights > 0 || !r.simulationReproducible || !r.intentReproducible) {
    console.error("\nFAIL: engine produced ungrounded insights or non-deterministic output");
    process.exit(1);
  }
  console.log("\nAll deterministic checks passed.");
}

main();
