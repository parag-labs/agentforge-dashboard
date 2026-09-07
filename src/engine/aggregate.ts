/**
 * The metrics aggregator: rolls a fleet up into the hero/overview numbers the LLD lists (total
 * agents, active in last 24h, average success rate, total weekly cost, agents needing attention,
 * and an overall fleet health score). All deterministic, derived purely from the fleet.
 */

import { round } from "./rng";
import type { AgentRecord } from "./types";

export interface FleetSummary {
  readonly totalAgents: number;
  readonly activeToday: number;
  readonly avgSuccessRate: number; // 0..1
  readonly avgLatencyMs: number;
  readonly totalCostWeek: number; // USD, estimated from runs/hour * cost/run * 7d
  readonly needingAttention: number;
  readonly healthScore: number; // 0..100
}

/** Estimated weekly cost for one agent: runs/hour × 24 × 7 × cost/run. */
export function weeklyCost(rec: AgentRecord): number {
  return rec.metrics.runsPerHour * 24 * 7 * rec.metrics.costPerRun;
}

/** An agent needs attention if it is in error/degraded or its trust/success dipped low. */
export function needsAttention(rec: AgentRecord): boolean {
  const s = rec.agent.status;
  return s === "error" || s === "degraded" || rec.metrics.successRate < 0.85 || rec.metrics.trustScore < 0.7;
}

/** A 0..100 fleet health score blending success, uptime, trust, and the error fraction. */
export function fleetHealthScore(fleet: readonly AgentRecord[]): number {
  if (fleet.length === 0) return 0;
  const avg = (f: (r: AgentRecord) => number) => fleet.reduce((s, r) => s + f(r), 0) / fleet.length;
  const success = avg((r) => r.metrics.successRate);
  const uptime = avg((r) => r.metrics.uptime);
  const trust = avg((r) => r.metrics.trustScore);
  const errorFrac = fleet.filter((r) => r.agent.status === "error").length / fleet.length;
  const score = (success * 0.4 + uptime * 0.3 + trust * 0.3) * 100 - errorFrac * 15;
  return round(Math.max(0, Math.min(100, score)), 1);
}

/** Summarize a fleet into the overview hero metrics. */
export function summarize(fleet: readonly AgentRecord[]): FleetSummary {
  if (fleet.length === 0) {
    return { totalAgents: 0, activeToday: 0, avgSuccessRate: 0, avgLatencyMs: 0, totalCostWeek: 0, needingAttention: 0, healthScore: 0 };
  }
  const activeToday = fleet.filter((r) => r.agent.lastActiveAt >= -24).length;
  const avgSuccessRate = round(fleet.reduce((s, r) => s + r.metrics.successRate, 0) / fleet.length, 3);
  const avgLatencyMs = Math.round(fleet.reduce((s, r) => s + r.metrics.avgLatencyMs, 0) / fleet.length);
  const totalCostWeek = round(fleet.reduce((s, r) => s + weeklyCost(r), 0), 2);
  const needingAttention = fleet.filter(needsAttention).length;
  return {
    totalAgents: fleet.length,
    activeToday,
    avgSuccessRate,
    avgLatencyMs,
    totalCostWeek,
    needingAttention,
    healthScore: fleetHealthScore(fleet),
  };
}
