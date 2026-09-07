import { describe, expect, it } from "vitest";
import { generateFleet, generateActivity } from "../simulation";

describe("simulation engine", () => {
  it("is deterministic for a given seed", () => {
    expect(generateFleet(42, 10)).toEqual(generateFleet(42, 10));
    expect(generateActivity(generateFleet(1, 8), 7)).toEqual(generateActivity(generateFleet(1, 8), 7));
  });

  it("generates the requested number of diverse agents", () => {
    const fleet = generateFleet(42, 10);
    expect(fleet).toHaveLength(10);
    expect(new Set(fleet.map((r) => r.agent.name)).size).toBe(10); // all distinct archetypes
  });

  it("produces metrics within valid ranges", () => {
    for (const { metrics: m } of generateFleet(42, 12)) {
      expect(m.successRate).toBeGreaterThanOrEqual(0);
      expect(m.successRate).toBeLessThanOrEqual(1);
      expect(m.errorRate).toBeCloseTo(1 - m.successRate, 2);
      expect(m.p95LatencyMs).toBeGreaterThanOrEqual(m.avgLatencyMs);
      expect(m.costPerRun).toBeGreaterThan(0);
      expect(m.trustScore).toBeGreaterThanOrEqual(0);
      expect(m.trustScore).toBeLessThanOrEqual(1);
    }
  });

  it("gives every agent a 24-point time-series", () => {
    for (const { series } of generateFleet(3, 6)) {
      expect(series.latency).toHaveLength(24);
      expect(series.successRate.every((p) => p.value <= 1)).toBe(true);
    }
  });

  it("different seeds produce different fleets", () => {
    expect(generateFleet(1, 8)).not.toEqual(generateFleet(2, 8));
  });
});
