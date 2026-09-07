"use client";

import { useMemo, useState } from "react";
import {
  generateFleet,
  generateActivity,
  summarize,
  compare,
  fleetInsights,
  comparisonInsights,
  parseIntent,
  applyIntent,
  weeklyCost,
  AXES,
  round,
  type AgentRecord,
  type Insight,
} from "@/engine";
import { Badge, Sparkline, Radar, SERIES_COLORS, type RadarSeries } from "./ui";
import { AgentMapView } from "./AgentMapView";

type View = "overview" | "registry" | "detail" | "compare" | "map";

const FLEET = generateFleet(42, 10);
const ACTIVITY = generateActivity(FLEET, 7);

const INTENT_SUGGESTIONS = ["Show expensive agents", "Healthy only", "Which agents need attention?", "Best quality agents"];

export function Dashboard() {
  const [view, setView] = useState<View>("overview");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([FLEET[0]!.agent.id, FLEET[1]!.agent.id, FLEET[2]!.agent.id]);
  const [intentText, setIntentText] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const intent = useMemo(() => (intentText.trim() ? parseIntent(intentText) : null), [intentText]);
  const summary = useMemo(() => summarize(FLEET), []);
  const insights = useMemo(() => fleetInsights(FLEET), []);

  function openDetail(id: string) {
    setSelectedId(id);
    setView("detail");
  }
  function toggleCompare(id: string) {
    setCompareIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 6 ? [...prev, id] : prev));
  }
  function runIntent(text: string) {
    setIntentText(text);
    const parsed = parseIntent(text);
    if (parsed.action === "compare") setView("registry");
    else setView("registry");
  }

  const selected = FLEET.find((r) => r.agent.id === selectedId) ?? null;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="logo" />
          AgentForge
        </div>
        <nav className="nav">
          <button className={view === "overview" ? "active" : ""} onClick={() => setView("overview")}>◇ Overview</button>
          <button className={view === "registry" ? "active" : ""} onClick={() => setView("registry")}>▤ Registry</button>
          <button className={view === "compare" ? "active" : ""} onClick={() => setView("compare")}>⇄ Compare</button>
          <button className={view === "map" ? "active" : ""} onClick={() => setView("map")}>⬡ Agent map</button>
          {selected && <button className={view === "detail" ? "active" : ""} onClick={() => setView("detail")}>◉ {selected.agent.name}</button>}
        </nav>
        <div style={{ position: "absolute", bottom: 16, left: 14, right: 14 }}>
          <div className="mono muted" style={{ fontSize: 11 }}>
            {summary.totalAgents} agents · health {summary.healthScore}/100
          </div>
        </div>
      </aside>

      <main className="main">
        {/* Intent bar */}
        <div className="intentbar">
          <input
            value={intentText}
            onChange={(e) => setIntentText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runIntent(intentText)}
            placeholder='Try "show expensive agents" or "which agents need attention?"'
          />
          {INTENT_SUGGESTIONS.map((s) => (
            <span key={s} className="intent-chip" onClick={() => runIntent(s)}>{s}</span>
          ))}
        </div>
        {intent && view === "registry" && <div className="intent-echo">Understood: {intent.summary}</div>}

        {view === "overview" && <Overview summary={summary} insights={insights} onOpen={openDetail} />}
        {view === "registry" && (
          <Registry
            fleet={FLEET}
            intent={intent}
            search={search}
            setSearch={setSearch}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            compareIds={compareIds}
            toggleCompare={toggleCompare}
            onOpen={openDetail}
            goCompare={() => setView("compare")}
          />
        )}
        {view === "detail" && selected && <Detail rec={selected} onCompare={() => { toggleCompare(selected.agent.id); setView("compare"); }} />}
        {view === "compare" && <Compare fleet={FLEET} ids={compareIds} toggle={toggleCompare} />}
        {view === "map" && (
          <>
            <h1>Agent map</h1>
            <p className="sub">Agents linked by the tools they share. Click a node to open its detail.</p>
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <AgentMapView fleet={FLEET} onSelect={openDetail} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// --- Overview ---

function Overview({ summary, insights, onOpen }: { summary: ReturnType<typeof summarize>; insights: Insight[]; onOpen: (id: string) => void }) {
  const spotlight = [...FLEET].sort((a, b) => weeklyCost(b) - weeklyCost(a)).slice(0, 6);
  return (
    <>
      <h1>Overview</h1>
      <p className="sub">Your agent fleet at a glance — health, activity, cost, and attention signals.</p>

      <div className="hero">
        <Metric label="Total agents" value={String(summary.totalAgents)} />
        <Metric label="Active today" value={String(summary.activeToday)} />
        <Metric label="Avg success" value={`${Math.round(summary.avgSuccessRate * 100)}%`} />
        <Metric label="Avg latency" value={`${summary.avgLatencyMs}ms`} small />
        <Metric label="Cost (7d)" value={`$${Math.round(summary.totalCostWeek).toLocaleString()}`} small />
        <Metric label="Fleet health" value={`${summary.healthScore}`} />
      </div>

      <div className="detail-grid" style={{ marginTop: 18 }}>
        <div>
          <h2 className="section">Agents by weekly cost</h2>
          <div className="grid">
            {spotlight.map((r) => <AgentCard key={r.agent.id} rec={r} onOpen={onOpen} />)}
          </div>
        </div>
        <div>
          <h2 className="section">Generative insights</h2>
          <div className="card">
            {insights.length === 0 && <div className="empty">No insights yet.</div>}
            {insights.map((i, idx) => <InsightRow key={idx} insight={i} />)}
          </div>
          <h2 className="section">Live activity</h2>
          <div className="card feed">
            {ACTIVITY.slice(0, 8).map((e) => (
              <div className="item" key={e.id}>
                <span className={`evt-dot evt-${e.kind}`} />
                {e.message}
                <span className="when">{e.at < 60 ? `${e.at}m` : `${Math.round(e.at / 60)}h`} ago</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function Metric({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="card metric">
      <div className="label">{label}</div>
      <div className={`value ${small ? "small" : ""}`}>{value}</div>
    </div>
  );
}

function InsightRow({ insight }: { insight: Insight }) {
  const spark = insight.severity === "good" ? "✦" : insight.severity === "warn" ? "▲" : "◆";
  return (
    <div className={`insight ${insight.severity}`}>
      <span className="spark">{spark}</span>
      <span>{insight.text}</span>
    </div>
  );
}

// --- Registry ---

function Registry(props: {
  fleet: readonly AgentRecord[];
  intent: ReturnType<typeof parseIntent> | null;
  search: string;
  setSearch: (s: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  compareIds: string[];
  toggleCompare: (id: string) => void;
  onOpen: (id: string) => void;
  goCompare: () => void;
}) {
  const { fleet, intent, search, setSearch, statusFilter, setStatusFilter, compareIds, toggleCompare, onOpen, goCompare } = props;
  let list = intent ? applyIntent(intent, fleet) : [...fleet];
  if (search.trim()) {
    const q = search.toLowerCase();
    list = list.filter((r) => r.agent.name.toLowerCase().includes(q) || r.agent.capabilities.some((c) => c.includes(q)) || r.agent.tags.some((t) => t.includes(q)));
  }
  if (statusFilter !== "all") list = list.filter((r) => r.agent.status === statusFilter);

  return (
    <>
      <div className="spread">
        <div>
          <h1>Registry</h1>
          <p className="sub">{list.length} of {fleet.length} agents</p>
        </div>
        {compareIds.length >= 2 && <button className="btn primary" onClick={goCompare}>Compare {compareIds.length} →</button>}
      </div>

      <div className="toolbar">
        <input placeholder="Search agents, capabilities, tags…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="healthy">Healthy</option>
          <option value="degraded">Degraded</option>
          <option value="error">Error</option>
          <option value="idle">Idle</option>
        </select>
      </div>

      {list.length === 0 ? (
        <div className="empty">No agents match.</div>
      ) : (
        <div className="grid">
          {list.map((r) => (
            <AgentCard key={r.agent.id} rec={r} onOpen={onOpen} inCompare={compareIds.includes(r.agent.id)} onToggleCompare={toggleCompare} />
          ))}
        </div>
      )}
    </>
  );
}

function AgentCard({ rec, onOpen, inCompare, onToggleCompare }: { rec: AgentRecord; onOpen: (id: string) => void; inCompare?: boolean; onToggleCompare?: (id: string) => void }) {
  const { agent, metrics, series } = rec;
  return (
    <div className="card agent-card" onClick={() => onOpen(agent.id)}>
      <div className="spread">
        <div className="agent-head">
          <div className="avatar">{agent.icon}</div>
          <div>
            <div className="agent-name">{agent.name}</div>
            <div className="mono muted" style={{ fontSize: 11 }}>{agent.version}</div>
          </div>
        </div>
        <Badge status={agent.status} />
      </div>
      <div className="agent-desc">{agent.description}</div>
      <Sparkline points={series.successRate} width={228} height={30} color="#22d3ee" />
      <div className="mini-metrics">
        <div className="mini"><div className="k">Success</div><div className="v">{Math.round(metrics.successRate * 100)}%</div></div>
        <div className="mini"><div className="k">p95</div><div className="v">{metrics.p95LatencyMs}ms</div></div>
        <div className="mini"><div className="k">$/run</div><div className="v">${metrics.costPerRun}</div></div>
      </div>
      {onToggleCompare && (
        <div className="row" style={{ marginTop: 10 }} onClick={(e) => e.stopPropagation()}>
          <button className={`btn sm ${inCompare ? "primary" : "ghost"}`} onClick={() => onToggleCompare(agent.id)}>
            {inCompare ? "✓ In compare" : "+ Compare"}
          </button>
          <button className="btn sm ghost" onClick={() => onOpen(agent.id)}>View</button>
        </div>
      )}
    </div>
  );
}

// --- Detail ---

function Detail({ rec, onCompare }: { rec: AgentRecord; onCompare: () => void }) {
  const { agent, metrics, series } = rec;
  return (
    <>
      <div className="spread">
        <div className="agent-head">
          <div className="avatar" style={{ width: 52, height: 52, fontSize: 26 }}>{agent.icon}</div>
          <div>
            <h1 style={{ marginBottom: 2 }}>{agent.name}</h1>
            <div className="row"><Badge status={agent.status} /><span className="mono muted">{agent.version}</span></div>
          </div>
        </div>
        <button className="btn" onClick={onCompare}>Add to compare</button>
      </div>
      <p className="sub" style={{ marginTop: 12 }}>{agent.description}</p>

      <div className="detail-grid">
        <div className="card">
          <h2 className="section" style={{ marginTop: 0 }}>Performance (24h)</h2>
          <ChartRow label="Success rate" points={series.successRate} color="#34d399" fmt={(v) => `${Math.round(v * 100)}%`} />
          <ChartRow label="Latency" points={series.latency} color="#7c6cff" fmt={(v) => `${Math.round(v)}ms`} />
          <ChartRow label="Cost / run" points={series.cost} color="#fbbf24" fmt={(v) => `$${round(v, 4)}`} />
        </div>
        <div className="card">
          <h2 className="section" style={{ marginTop: 0 }}>Scores</h2>
          <KV k="Quality" v={`${Math.round(metrics.qualityScore * 100)}%`} />
          <KV k="Trust" v={`${Math.round(metrics.trustScore * 100)}%`} />
          <KV k="Uptime" v={`${round(metrics.uptime * 100, 2)}%`} />
          <KV k="Error rate" v={`${round(metrics.errorRate * 100, 1)}%`} />
          <KV k="Tokens / run" v={metrics.tokensPerRun.toLocaleString()} />
          <KV k="Runs / hour" v={String(metrics.runsPerHour)} />
          <KV k="Total runs" v={metrics.runsCount.toLocaleString()} />
          <KV k="Weekly cost" v={`$${Math.round(weeklyCost(rec)).toLocaleString()}`} />
        </div>
      </div>

      <h2 className="section">Capabilities & tools</h2>
      <div className="card">
        <div className="row" style={{ marginBottom: 8 }}>
          {agent.capabilities.map((c) => <span key={c} className="tag">{c}</span>)}
        </div>
        <div className="row">
          {agent.tools.map((t) => <span key={t} className="tag" style={{ color: "#22d3ee" }}>🔧 {t}</span>)}
        </div>
      </div>
    </>
  );
}

function ChartRow({ label, points, color, fmt }: { label: string; points: readonly { t: number; value: number }[]; color: string; fmt: (v: number) => string }) {
  const last = points.at(-1)?.value ?? 0;
  return (
    <div className="spread" style={{ padding: "10px 0", borderBottom: "1px solid var(--glass-border)" }}>
      <div>
        <div className="muted" style={{ fontSize: 12 }}>{label}</div>
        <div style={{ fontWeight: 600, fontSize: 15 }}>{fmt(last)}</div>
      </div>
      <Sparkline points={points} width={180} height={40} color={color} />
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return <div className="kv"><span className="k">{k}</span><span className="v">{v}</span></div>;
}

// --- Compare ---

function Compare({ fleet, ids, toggle }: { fleet: readonly AgentRecord[]; ids: string[]; toggle: (id: string) => void }) {
  const recs = ids.map((id) => fleet.find((r) => r.agent.id === id)!).filter(Boolean);

  if (recs.length < 2) {
    return (
      <>
        <h1>Comparison cockpit</h1>
        <p className="sub">Pick 2–6 agents from the registry to compare them side by side.</p>
        <div className="card"><div className="empty">Select at least two agents to compare.</div></div>
        <Picker fleet={fleet} ids={ids} toggle={toggle} />
      </>
    );
  }

  const cmp = compare(recs);
  const cInsights = comparisonInsights(cmp, recs);
  const radarSeries: RadarSeries[] = recs.map((r, i) => ({
    label: r.agent.name,
    color: SERIES_COLORS[i % SERIES_COLORS.length]!,
    values: cmp.axes.map((ax) => ax.scores[r.agent.id] ?? 0),
  }));

  return (
    <>
      <div className="spread">
        <div>
          <h1>Comparison cockpit</h1>
          <p className="sub">Comparing {recs.length} agents across six axes.</p>
        </div>
      </div>

      <div className="detail-grid">
        <div className="card raise">
          <h2 className="section" style={{ marginTop: 0 }}>Multi-axis radar</h2>
          <div style={{ display: "grid", placeItems: "center" }}>
            <Radar axes={cmp.axes.map((a) => a.label)} series={radarSeries} />
          </div>
          <div className="row" style={{ justifyContent: "center", marginTop: 6 }}>
            {radarSeries.map((s) => (
              <span key={s.label} className="row" style={{ gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color, display: "inline-block" }} />
                <span style={{ fontSize: 12 }}>{s.label}</span>
              </span>
            ))}
          </div>
        </div>

        <div>
          <h2 className="section" style={{ marginTop: 0 }}>Insights</h2>
          <div className="card">
            {cInsights.map((i, idx) => <InsightRow key={idx} insight={i} />)}
          </div>
        </div>
      </div>

      <h2 className="section">Side-by-side</h2>
      <div className="card" style={{ overflowX: "auto" }}>
        <table className="cmp-table">
          <thead>
            <tr>
              <th>Axis</th>
              {recs.map((r) => (
                <th key={r.agent.id}>
                  {r.agent.icon} {r.agent.name}
                  {cmp.overallWinnerId === r.agent.id && <span className="winner-pill" style={{ marginLeft: 6 }}>winner</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {AXES.map((ax) => {
              const axisScore = cmp.axes.find((a) => a.axis === ax.key)!;
              return (
                <tr key={ax.key}>
                  <td>{ax.label}</td>
                  {recs.map((r) => {
                    const norm = axisScore.scores[r.agent.id] ?? 0;
                    const raw = ax.get(r.metrics);
                    const isBest = axisScore.winnerId === r.agent.id;
                    return (
                      <td key={r.agent.id} className="num">
                        <div className="spread">
                          <span>{formatRaw(ax.key, raw)}</span>
                          {isBest && <span className="winner-pill">best</span>}
                        </div>
                        <div className="bar"><span style={{ width: `${norm * 100}%` }} /></div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            <tr>
              <td><strong>Overall</strong></td>
              {recs.map((r) => (
                <td key={r.agent.id} className="num"><strong>{Math.round((cmp.overall[r.agent.id] ?? 0) * 100)}</strong></td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="section">Adjust selection</h2>
      <Picker fleet={fleet} ids={ids} toggle={toggle} />
    </>
  );
}

function Picker({ fleet, ids, toggle }: { fleet: readonly AgentRecord[]; ids: string[]; toggle: (id: string) => void }) {
  return (
    <div className="row">
      {fleet.map((r) => {
        const on = ids.includes(r.agent.id);
        const full = !on && ids.length >= 6;
        return (
          <button key={r.agent.id} className={`btn sm ${on ? "primary" : "ghost"}`} disabled={full} onClick={() => toggle(r.agent.id)}>
            {r.agent.icon} {r.agent.name}
          </button>
        );
      })}
    </div>
  );
}

function formatRaw(key: string, v: number): string {
  switch (key) {
    case "successRate":
    case "qualityScore":
    case "trustScore":
      return `${Math.round(v * 100)}%`;
    case "p95LatencyMs":
      return `${Math.round(v)}ms`;
    case "costPerRun":
      return `$${v}`;
    case "tokensPerRun":
      return v.toLocaleString();
    default:
      return String(v);
  }
}
