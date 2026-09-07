/**
 * The intent parser powering the intent-first top bar. Users type things like "show expensive
 * agents", "healthy only", or "compare my research agents" and get a structured intent that the
 * UI applies as a filter/sort/action. This is a deterministic, rule-based parser (the LLD allows
 * "simple rule-based + optional on-device LLM") so it needs no model and is fully testable.
 */

import type { AgentRecord, AgentStatus } from "./types";

export interface Intent {
  /** What the user wants to do with the result. */
  readonly action: "filter" | "compare" | "sort";
  readonly filters: {
    readonly status?: AgentStatus;
    readonly text?: string; // capability/tag/name keyword
    readonly needsAttention?: boolean;
  };
  readonly sort?: { readonly by: "cost" | "latency" | "success" | "quality" | "trust"; readonly dir: "asc" | "desc" };
  /** Human-readable echo of what was understood. */
  readonly summary: string;
}

const STATUS_WORDS: Record<string, AgentStatus> = {
  healthy: "healthy",
  degraded: "degraded",
  error: "error",
  errored: "error",
  failing: "error",
  idle: "idle",
};

/** Parse a free-text intent into a structured query. Always returns something usable. */
export function parseIntent(input: string): Intent {
  const q = input.toLowerCase().trim();
  const filters: Intent["filters"] = {};
  let action: Intent["action"] = "filter";
  let sort: Intent["sort"] | undefined;

  if (/\bcompare\b/.test(q)) action = "compare";

  for (const [word, status] of Object.entries(STATUS_WORDS)) {
    if (q.includes(word)) (filters as { status?: AgentStatus }).status = status;
  }
  if (/\bonly\b/.test(q) && /\bhealthy\b/.test(q)) (filters as { status?: AgentStatus }).status = "healthy";
  if (/attention|risk|problem|needs? (help|attention)|unhealthy/.test(q)) {
    (filters as { needsAttention?: boolean }).needsAttention = true;
  }

  if (/expensive|costly|cost|pricey/.test(q)) {
    sort = { by: "cost", dir: /cheap|least|lowest/.test(q) ? "asc" : "desc" };
    action = action === "compare" ? "compare" : "sort";
  } else if (/slow|latency|fast/.test(q)) {
    sort = { by: "latency", dir: /fast|quick|lowest/.test(q) ? "asc" : "desc" };
    action = action === "compare" ? "compare" : "sort";
  } else if (/best|top|quality|reliable|trust/.test(q)) {
    sort = { by: /trust/.test(q) ? "trust" : /quality/.test(q) ? "quality" : "success", dir: "desc" };
  }

  // A keyword like a capability, tag, or archetype ("research", "code", "finance").
  const keyword = q
    .replace(/\b(show|me|agents?|that|are|only|my|compare|expensive|cheap|slow|fast|best|top|healthy|degraded|error|idle|with|the|and|need|attention)\b/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
  if (keyword.length >= 3) (filters as { text?: string }).text = keyword.split(/\s+/)[0];

  return { action, filters, ...(sort ? { sort } : {}), summary: describe(action, filters, sort) };
}

function describe(action: Intent["action"], filters: Intent["filters"], sort: Intent["sort"]): string {
  const parts: string[] = [];
  if (action === "compare") parts.push("Compare");
  else if (sort) parts.push(`Sort by ${sort.by} (${sort.dir === "desc" ? "high→low" : "low→high"})`);
  else parts.push("Show");
  if (filters.status) parts.push(`${filters.status} agents`);
  else if (filters.needsAttention) parts.push("agents needing attention");
  else if (action !== "compare" && !sort) parts.push("agents");
  if (filters.text) parts.push(`matching "${filters.text}"`);
  return parts.join(" ");
}

/** Apply a parsed intent to a fleet, returning the filtered/sorted records. */
export function applyIntent(intent: Intent, fleet: readonly AgentRecord[]): AgentRecord[] {
  let out = [...fleet];
  const f = intent.filters;

  if (f.status) out = out.filter((r) => r.agent.status === f.status);
  if (f.needsAttention) {
    out = out.filter((r) => r.agent.status === "error" || r.agent.status === "degraded" || r.metrics.successRate < 0.85 || r.metrics.trustScore < 0.7);
  }
  if (f.text) {
    const t = f.text;
    out = out.filter(
      (r) =>
        r.agent.name.toLowerCase().includes(t) ||
        r.agent.capabilities.some((c) => c.includes(t)) ||
        r.agent.tags.some((g) => g.includes(t)) ||
        r.agent.tools.some((tool) => tool.includes(t)),
    );
  }

  if (intent.sort) {
    const { by, dir } = intent.sort;
    const val = (r: AgentRecord): number => {
      switch (by) {
        case "cost": return r.metrics.costPerRun;
        case "latency": return r.metrics.p95LatencyMs;
        case "success": return r.metrics.successRate;
        case "quality": return r.metrics.qualityScore;
        case "trust": return r.metrics.trustScore;
      }
    };
    out.sort((a, b) => (dir === "asc" ? val(a) - val(b) : val(b) - val(a)));
  }

  return out;
}
