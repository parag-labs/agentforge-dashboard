/**
 * The simulation engine. It generates a realistic, diverse fleet of agents with correlated
 * metrics and time-series, plus a live activity feed - all from a seed, so the dashboard looks
 * alive and the tests/eval are reproducible. This is the "rich Simulation Engine" the LLD asks
 * for so the demo never looks empty or static, without any real LLM calls.
 */

import { between, intBetween, pick, round, rng, sample, type Rng } from "./rng";
import type { Agent, AgentMetrics, AgentRecord, ActivityEvent, AgentStatus, MetricPoint, MetricSeries } from "./types";

const ARCHETYPES = [
  { name: "ResearchAgent", icon: "🔬", desc: "Deep web research with citation-backed answers.", caps: ["research", "summarization", "citation"], tools: ["web_search", "browser", "vector_db"] },
  { name: "CodeReviewer", icon: "🧑‍💻", desc: "Reviews pull requests for bugs and security.", caps: ["code-review", "security", "static-analysis"], tools: ["git", "linter", "sast"] },
  { name: "SupportAgent", icon: "🎧", desc: "Answers customer questions from the knowledge base.", caps: ["support", "retrieval", "tone"], tools: ["kb_search", "ticketing", "email"] },
  { name: "DataWrangler", icon: "📊", desc: "Cleans and transforms datasets on request.", caps: ["data", "sql", "charts"], tools: ["sql", "pandas", "sheets"] },
  { name: "TriageBot", icon: "🚑", desc: "Diagnoses failing pipelines and files bugs.", caps: ["triage", "logs", "root-cause"], tools: ["logs", "metrics", "issue_tracker"] },
  { name: "SchedulerAgent", icon: "📅", desc: "Coordinates meetings across calendars.", caps: ["scheduling", "email", "timezones"], tools: ["calendar", "email"] },
  { name: "ContentWriter", icon: "✍️", desc: "Drafts marketing and docs content.", caps: ["writing", "seo", "editing"], tools: ["cms", "web_search"] },
  { name: "FinanceAgent", icon: "💰", desc: "Summarizes spend and flags anomalies.", caps: ["finance", "anomaly", "reporting"], tools: ["ledger", "sql", "charts"] },
  { name: "TranslatorAgent", icon: "🌐", desc: "Translates and localizes content.", caps: ["translation", "localization"], tools: ["mt_engine", "glossary"] },
  { name: "QAAgent", icon: "✅", desc: "Generates and runs test cases.", caps: ["testing", "coverage"], tools: ["test_runner", "coverage"] },
  { name: "SalesAgent", icon: "🤝", desc: "Qualifies leads and drafts outreach.", caps: ["sales", "crm", "outreach"], tools: ["crm", "email"] },
  { name: "SecurityScout", icon: "🛡️", desc: "Scans dependencies for vulnerabilities.", caps: ["security", "sca", "alerts"], tools: ["sca", "sbom", "alerts"] },
] as const;

const TAGS = ["prod", "staging", "personal", "shared", "experimental", "critical"] as const;

/** Weighted status: mostly healthy, some degraded/idle, few errors. */
function statusFor(r: Rng): AgentStatus {
  const x = r();
  if (x < 0.62) return "healthy";
  if (x < 0.82) return "idle";
  if (x < 0.94) return "degraded";
  return "error";
}

/** Generate correlated metrics consistent with a status (errors cost more, succeed less). */
function metricsFor(r: Rng, agentId: string, status: AgentStatus): AgentMetrics {
  const base = status === "healthy" ? 0.97 : status === "idle" ? 0.9 : status === "degraded" ? 0.8 : 0.55;
  const successRate = round(Math.min(0.999, Math.max(0.3, base - between(r, 0, 0.08))), 3);
  const errorRate = round(1 - successRate, 3);
  const avgLatencyMs = Math.round(between(r, 300, 1400) * (status === "degraded" ? 1.8 : status === "error" ? 2.4 : 1));
  const p95LatencyMs = Math.round(avgLatencyMs * between(r, 1.6, 2.6));
  const tokensPerRun = Math.round(between(r, 400, 6000));
  const costPerRun = round((tokensPerRun / 1000) * between(r, 0.002, 0.03), 4);
  const qualityScore = round(Math.min(0.99, Math.max(0.4, successRate - between(r, -0.05, 0.12))), 3);
  const trustScore = round(Math.min(0.99, Math.max(0.4, qualityScore - between(r, -0.03, 0.1))), 3);
  const uptime = round(Math.min(0.9999, Math.max(0.9, base + between(r, 0, 0.03))), 4);
  const runsCount = intBetween(r, 200, 90000);
  const runsPerHour = Math.round(between(r, 2, 240) * (status === "idle" ? 0.2 : 1));
  return {
    agentId,
    successRate,
    avgLatencyMs,
    p95LatencyMs,
    costPerRun,
    tokensPerRun,
    qualityScore,
    trustScore,
    errorRate,
    uptime,
    runsCount,
    runsPerHour,
  };
}

/** A gently varying time-series around a center value, deterministic per seed. */
function series(r: Rng, agentId: string, m: AgentMetrics): MetricSeries {
  const HOURS = 24;
  const mk = (center: number, jitter: number, drift = 0): MetricPoint[] =>
    Array.from({ length: HOURS }, (_, i) => {
      const t = -(HOURS - 1 - i);
      const wobble = Math.sin((i / HOURS) * Math.PI * 2 + center) * jitter;
      const value = center + wobble + drift * (i / HOURS) + between(r, -jitter, jitter) * 0.5;
      return { t, value: round(Math.max(0, value), 4) };
    });
  return {
    agentId,
    latency: mk(m.avgLatencyMs, m.avgLatencyMs * 0.18),
    successRate: mk(m.successRate, 0.04).map((p) => ({ t: p.t, value: round(Math.min(1, p.value), 4) })),
    cost: mk(m.costPerRun, m.costPerRun * 0.25),
  };
}

/** Generate a full fleet of `count` agents (8-12 recommended). */
export function generateFleet(seed = 42, count = 10): AgentRecord[] {
  const r = rng(seed);
  const archetypes = sample(r, ARCHETYPES, Math.min(count, ARCHETYPES.length));
  const now = 0;
  return archetypes.map((a, i) => {
    const id = `agent_${i + 1}`;
    const status = statusFor(r);
    const agent: Agent = {
      id,
      name: a.name,
      description: a.desc,
      status,
      version: `v${intBetween(r, 1, 4)}.${intBetween(r, 0, 9)}.${intBetween(r, 0, 9)}`,
      capabilities: a.caps,
      tools: a.tools,
      tags: sample(r, TAGS, intBetween(r, 1, 3)),
      createdAt: now - intBetween(r, 30, 400) * 24,
      lastActiveAt: status === "idle" ? now - intBetween(r, 6, 72) : now - intBetween(r, 0, 3),
      icon: a.icon,
    };
    const metrics = metricsFor(r, id, status);
    return { agent, metrics, series: series(r, id, metrics) };
  });
}

const ACTIVITY_TEMPLATES: Record<ActivityEvent["kind"], (name: string) => string> = {
  run: (n) => `${n} completed a run`,
  error: (n) => `${n} hit an error and retried`,
  deploy: (n) => `${n} was deployed to a new version`,
  cost_spike: (n) => `${n} cost spiked above its 7-day average`,
  degraded: (n) => `${n} degraded — latency climbing`,
  recovered: (n) => `${n} recovered to healthy`,
};

/** Generate a deterministic live activity feed for the fleet. */
export function generateActivity(fleet: readonly AgentRecord[], seed = 7, count = 14): ActivityEvent[] {
  const r = rng(seed);
  const kinds: ActivityEvent["kind"][] = ["run", "run", "run", "error", "deploy", "cost_spike", "degraded", "recovered"];
  return Array.from({ length: count }, (_, i) => {
    const rec = pick(r, fleet);
    const kind = pick(r, kinds);
    return {
      id: `act_${i + 1}`,
      agentId: rec.agent.id,
      agentName: rec.agent.name,
      kind,
      message: ACTIVITY_TEMPLATES[kind](rec.agent.name),
      at: intBetween(r, 0, 180),
    };
  }).sort((a, b) => a.at - b.at);
}
