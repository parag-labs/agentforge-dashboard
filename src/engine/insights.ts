/**
 * The generative insights panel - deterministic, template-driven natural-language observations
 * about the fleet and about a comparison. The LLD's example ("Your ResearchAgent is 2.3× more
 * expensive than similar agents for the same success rate") is produced here from real computed
 * numbers, so the "generative" panel is grounded and never fabricates a figure.
 */

import { weeklyCost, needsAttention } from "./aggregate";
import { round } from "./rng";
import type { Comparison } from "./compare";
import type { AgentRecord } from "./types";

export interface Insight {
  readonly kind: "cost" | "quality" | "trust" | "attention" | "tradeoff" | "recommendation";
  readonly severity: "info" | "good" | "warn";
  readonly text: string;
}

/** Observations about the whole fleet, ranked so the most useful surface first. */
export function fleetInsights(fleet: readonly AgentRecord[]): Insight[] {
  const out: Insight[] = [];
  if (fleet.length === 0) return out;

  // Most expensive agent relative to the fleet median weekly cost.
  const costs = fleet.map((r) => ({ r, cost: weeklyCost(r) })).sort((a, b) => b.cost - a.cost);
  const median = costs[Math.floor(costs.length / 2)]!.cost;
  const top = costs[0]!;
  if (median > 0 && top.cost > median * 1.5) {
    out.push({
      kind: "cost",
      severity: "warn",
      text: `${top.r.agent.name} is ${round(top.cost / median, 1)}× the fleet's median weekly cost ($${round(top.cost, 0)} vs $${round(median, 0)}).`,
    });
  }

  // Best quality-per-dollar agent.
  const efficiency = fleet
    .map((r) => ({ r, eff: r.metrics.costPerRun > 0 ? r.metrics.qualityScore / r.metrics.costPerRun : 0 }))
    .sort((a, b) => b.eff - a.eff)[0];
  if (efficiency) {
    out.push({
      kind: "quality",
      severity: "good",
      text: `${efficiency.r.agent.name} gives the best quality per dollar in your fleet.`,
    });
  }

  // Attention roll-up.
  const attention = fleet.filter(needsAttention);
  if (attention.length > 0) {
    out.push({
      kind: "attention",
      severity: "warn",
      text: `${attention.length} agent${attention.length > 1 ? "s need" : " needs"} attention: ${attention.map((r) => r.agent.name).join(", ")}.`,
    });
  }

  // Lowest-trust agent.
  const lowTrust = [...fleet].sort((a, b) => a.metrics.trustScore - b.metrics.trustScore)[0];
  if (lowTrust && lowTrust.metrics.trustScore < 0.75) {
    out.push({
      kind: "trust",
      severity: "warn",
      text: `${lowTrust.agent.name} has the lowest trust score (${round(lowTrust.metrics.trustScore * 100, 0)}%) — worth reviewing before relying on it.`,
    });
  }

  return out;
}

/** Observations about a specific comparison: winner, trade-offs, and a recommendation. */
export function comparisonInsights(cmp: Comparison, records: readonly AgentRecord[]): Insight[] {
  const nameOf = (id: string) => records.find((r) => r.agent.id === id)?.agent.name ?? id;
  const out: Insight[] = [];

  out.push({
    kind: "recommendation",
    severity: "good",
    text: `${nameOf(cmp.overallWinnerId)} leads overall across the six axes.`,
  });

  // A concrete cost/quality trade-off between the two closest overall contenders.
  const ordered = Object.entries(cmp.overall).sort((a, b) => b[1] - a[1]);
  if (ordered.length >= 2) {
    const [aId] = ordered[0]!;
    const [bId] = ordered[1]!;
    const a = records.find((r) => r.agent.id === aId)!;
    const b = records.find((r) => r.agent.id === bId)!;
    if (a.metrics.costPerRun !== b.metrics.costPerRun && a.metrics.qualityScore !== b.metrics.qualityScore) {
      const cheaper = a.metrics.costPerRun < b.metrics.costPerRun ? a : b;
      const better = a.metrics.qualityScore > b.metrics.qualityScore ? a : b;
      if (cheaper.agent.id !== better.agent.id) {
        out.push({
          kind: "tradeoff",
          severity: "info",
          text: `${cheaper.agent.name} is cheaper per run, but ${better.agent.name} scores higher on quality — a classic cost/quality trade-off.`,
        });
      }
    }
  }

  // Per-axis "best for" callouts.
  for (const [label, id] of Object.entries(cmp.bestFor)) {
    out.push({ kind: "recommendation", severity: "info", text: `Best for ${label.toLowerCase()}: ${nameOf(id)}.` });
  }

  return out;
}
