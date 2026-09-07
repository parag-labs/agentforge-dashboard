/**
 * The comparison engine - the product's core differentiator. Given 2-6 agents it computes, for
 * each comparison axis, a normalized score (0..1, higher = better), a per-axis ranking, an
 * overall winner, radar-chart data, and "best for X" recommendations. Cost and latency are
 * inverted (lower is better) before normalizing, so every axis reads "higher = better".
 *
 * Everything is deterministic and derived from the agents' metrics - no model calls.
 */

import { round } from "./rng";
import type { AgentMetrics, AgentRecord } from "./types";

/** The axes the LLD lists for comparison. `invert` = lower raw value is better. */
export const AXES = [
  { key: "successRate", label: "Success rate", get: (m: AgentMetrics) => m.successRate, invert: false },
  { key: "p95LatencyMs", label: "Latency (p95)", get: (m: AgentMetrics) => m.p95LatencyMs, invert: true },
  { key: "costPerRun", label: "Cost / run", get: (m: AgentMetrics) => m.costPerRun, invert: true },
  { key: "qualityScore", label: "Quality", get: (m: AgentMetrics) => m.qualityScore, invert: false },
  { key: "trustScore", label: "Trust", get: (m: AgentMetrics) => m.trustScore, invert: false },
  { key: "tokensPerRun", label: "Token efficiency", get: (m: AgentMetrics) => m.tokensPerRun, invert: true },
] as const;

export type AxisKey = (typeof AXES)[number]["key"];

export interface AxisScore {
  readonly axis: AxisKey;
  readonly label: string;
  /** agentId → normalized score 0..1 (higher is better). */
  readonly scores: Record<string, number>;
  /** agentId → rank (1 = best) on this axis. */
  readonly ranks: Record<string, number>;
  readonly winnerId: string;
}

export interface Comparison {
  readonly agentIds: readonly string[];
  readonly axes: readonly AxisScore[];
  /** agentId → mean normalized score across all axes. */
  readonly overall: Record<string, number>;
  readonly overallWinnerId: string;
  /** "Best for <axis label>" → agentId. */
  readonly bestFor: Record<string, string>;
}

/** Min-max normalize values to 0..1 (higher = better), honoring inverted axes. */
function normalize(values: Record<string, number>, invert: boolean): Record<string, number> {
  const nums = Object.values(values);
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const span = max - min;
  const out: Record<string, number> = {};
  for (const [id, v] of Object.entries(values)) {
    // When all equal, everyone gets 1 (no differentiation on this axis).
    const unit = span === 0 ? 1 : (v - min) / span;
    out[id] = round(invert ? 1 - unit : unit, 3);
  }
  return out;
}

function rankOf(scores: Record<string, number>): Record<string, number> {
  const ordered = Object.entries(scores).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const ranks: Record<string, number> = {};
  ordered.forEach(([id], i) => (ranks[id] = i + 1));
  return ranks;
}

/** Compare a set of agent records (2-6). Throws outside that range. */
export function compare(records: readonly AgentRecord[]): Comparison {
  if (records.length < 2 || records.length > 6) {
    throw new Error(`comparison requires 2-6 agents, got ${records.length}`);
  }
  const agentIds = records.map((r) => r.agent.id);

  const axes: AxisScore[] = AXES.map((ax) => {
    const raw: Record<string, number> = {};
    for (const rec of records) raw[rec.agent.id] = ax.get(rec.metrics);
    const scores = normalize(raw, ax.invert);
    const ranks = rankOf(scores);
    const winnerId = Object.entries(ranks).find(([, rank]) => rank === 1)![0];
    return { axis: ax.key, label: ax.label, scores, ranks, winnerId };
  });

  const overall: Record<string, number> = {};
  for (const id of agentIds) {
    overall[id] = round(axes.reduce((s, ax) => s + (ax.scores[id] ?? 0), 0) / axes.length, 3);
  }
  const overallWinnerId = Object.entries(overall).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]![0];

  const bestFor: Record<string, string> = {};
  for (const ax of axes) bestFor[ax.label] = ax.winnerId;

  return { agentIds, axes, overall, overallWinnerId, bestFor };
}
