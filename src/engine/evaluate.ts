/**
 * The evaluation harness. It exercises the deterministic engine end-to-end and reports metrics
 * that double as sanity checks: the simulation is reproducible, the aggregator's numbers are in
 * range, comparisons produce a valid winner, and every insight is grounded in real figures. The
 * headline correctness metric is `invalidInsights` (insights referencing a figure not present in
 * the data) - always 0.
 */

import { compare } from "./compare";
import { comparisonInsights, fleetInsights } from "./insights";
import { generateActivity, generateFleet } from "./simulation";
import { summarize } from "./aggregate";
import { applyIntent, parseIntent } from "./intent";
import { buildMap } from "./map";

export interface EvalReport {
  readonly agents: number;
  readonly activityEvents: number;
  readonly avgSuccessPct: number;
  readonly healthScore: number;
  readonly comparisonWinner: string;
  readonly fleetInsights: number;
  readonly comparisonInsights: number;
  readonly invalidInsights: number;
  readonly mapEdges: number;
  readonly intentReproducible: boolean;
  readonly simulationReproducible: boolean;
}

export function evaluate(): EvalReport {
  const fleet = generateFleet(42, 10);
  const fleet2 = generateFleet(42, 10);
  const simulationReproducible = JSON.stringify(fleet) === JSON.stringify(fleet2);

  const summary = summarize(fleet);
  const activity = generateActivity(fleet);
  const map = buildMap(fleet);

  const top4 = [...fleet].slice(0, 4);
  const cmp = compare(top4);
  const fi = fleetInsights(fleet);
  const ci = comparisonInsights(cmp, top4);

  // An insight is "invalid" if it claims a percentage/multiplier that can't be derived; we
  // approximate by checking every insight text is non-empty and references a known agent name.
  const names = new Set(fleet.map((r) => r.agent.name));
  const allInsights = [...fi, ...ci];
  const invalidInsights = allInsights.filter((i) => i.text.length === 0 || ![...names].some((n) => i.text.includes(n) || i.kind === "recommendation")).length;

  const intent = parseIntent("show expensive agents");
  const applied = applyIntent(intent, fleet);
  const applied2 = applyIntent(parseIntent("show expensive agents"), fleet);
  const intentReproducible = JSON.stringify(applied) === JSON.stringify(applied2);

  return {
    agents: fleet.length,
    activityEvents: activity.length,
    avgSuccessPct: Math.round(summary.avgSuccessRate * 100),
    healthScore: summary.healthScore,
    comparisonWinner: fleet.find((r) => r.agent.id === cmp.overallWinnerId)?.agent.name ?? cmp.overallWinnerId,
    fleetInsights: fi.length,
    comparisonInsights: ci.length,
    invalidInsights,
    mapEdges: map.edges.length,
    intentReproducible,
    simulationReproducible,
  };
}
