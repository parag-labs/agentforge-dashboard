/**
 * The core domain model. An Agent is a registered AI agent; AgentMetrics is a point-in-time
 * snapshot; MetricPoint is one sample in a time-series. The status and capability sets are
 * string-literal unions so invalid values are compile errors.
 */

import { z } from "zod";

export const agentStatus = z.enum(["healthy", "degraded", "error", "idle"]);
export type AgentStatus = z.infer<typeof agentStatus>;

export interface Agent {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly status: AgentStatus;
  readonly version: string;
  readonly capabilities: readonly string[];
  readonly tools: readonly string[];
  readonly tags: readonly string[];
  readonly createdAt: number;
  readonly lastActiveAt: number;
  /** A stable emoji/icon for the avatar. */
  readonly icon: string;
}

/** A point-in-time metrics snapshot for an agent (see AgentMetrics in the LLD). */
export interface AgentMetrics {
  readonly agentId: string;
  readonly successRate: number; // 0..1
  readonly avgLatencyMs: number;
  readonly p95LatencyMs: number;
  readonly costPerRun: number; // USD
  readonly tokensPerRun: number;
  readonly qualityScore: number; // 0..1
  readonly trustScore: number; // 0..1
  readonly errorRate: number; // 0..1
  readonly uptime: number; // 0..1
  readonly runsCount: number; // total runs
  readonly runsPerHour: number;
}

/** One sample of a named series over time. */
export interface MetricPoint {
  readonly t: number; // hours ago (0 = now), negative into the past
  readonly value: number;
}

/** The time-series bundle the detail/comparison views chart. */
export interface MetricSeries {
  readonly agentId: string;
  readonly latency: readonly MetricPoint[];
  readonly successRate: readonly MetricPoint[];
  readonly cost: readonly MetricPoint[];
}

/** A live activity-feed event. */
export interface ActivityEvent {
  readonly id: string;
  readonly agentId: string;
  readonly agentName: string;
  readonly kind: "run" | "error" | "deploy" | "cost_spike" | "degraded" | "recovered";
  readonly message: string;
  readonly at: number; // minutes ago
}

/** A full agent record with its current metrics and series - what the UI consumes. */
export interface AgentRecord {
  readonly agent: Agent;
  readonly metrics: AgentMetrics;
  readonly series: MetricSeries;
}

/** A comparison session (see the LLD). */
export interface ComparisonSession {
  readonly id: string;
  readonly agentIds: readonly string[];
  readonly createdAt: number;
}
