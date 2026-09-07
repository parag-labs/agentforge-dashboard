"use client";

import type { AgentStatus, MetricPoint } from "@/engine";

export function Badge({ status }: { status: AgentStatus }) {
  return (
    <span className={`badge ${status}`}>
      <span className="dot" />
      {status}
    </span>
  );
}

/** A compact inline-SVG sparkline. No chart dependency — deterministic and crisp. */
export function Sparkline({ points, width = 120, height = 34, color = "#7c6cff" }: { points: readonly MetricPoint[]; width?: number; height?: number; color?: string }) {
  if (points.length === 0) return null;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = width / (points.length - 1 || 1);
  const path = points
    .map((p, i) => {
      const x = i * step;
      const y = height - ((p.value - min) / span) * (height - 4) - 2;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const area = `${path} L${width},${height} L0,${height} Z`;
  const id = `spark-${color.replace("#", "")}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export interface RadarSeries {
  readonly label: string;
  readonly color: string;
  /** One value 0..1 per axis, in axis order. */
  readonly values: number[];
}

/** A multi-series radar chart in inline SVG for the comparison cockpit. */
export function Radar({ axes, series, size = 320 }: { axes: readonly string[]; series: readonly RadarSeries[]; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 46;
  const n = axes.length;
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const point = (i: number, v: number) => ({ x: cx + Math.cos(angle(i)) * r * v, y: cy + Math.sin(angle(i)) * r * v });

  const rings = [0.25, 0.5, 0.75, 1];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {rings.map((ring) => (
        <polygon
          key={ring}
          points={axes.map((_, i) => { const p = point(i, ring); return `${p.x},${p.y}`; }).join(" ")}
          fill="none"
          stroke="rgba(148,163,184,0.16)"
          strokeWidth="1"
        />
      ))}
      {axes.map((label, i) => {
        const p = point(i, 1.16);
        const edge = point(i, 1);
        return (
          <g key={label}>
            <line x1={cx} y1={cy} x2={edge.x} y2={edge.y} stroke="rgba(148,163,184,0.12)" strokeWidth="1" />
            <text x={p.x} y={p.y} fill="#97a3bd" fontSize="10" textAnchor="middle" dominantBaseline="middle">
              {label}
            </text>
          </g>
        );
      })}
      {series.map((s) => (
        <polygon
          key={s.label}
          points={s.values.map((v, i) => { const p = point(i, Math.max(0.02, v)); return `${p.x},${p.y}`; }).join(" ")}
          fill={s.color}
          fillOpacity="0.14"
          stroke={s.color}
          strokeWidth="1.8"
        />
      ))}
    </svg>
  );
}

export const SERIES_COLORS = ["#7c6cff", "#22d3ee", "#34d399", "#fbbf24", "#f87171", "#f472b6"] as const;
