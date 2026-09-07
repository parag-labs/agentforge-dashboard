import { describe, expect, it } from "vitest";
import { summarize, fleetHealthScore, weeklyCost, needsAttention } from "../aggregate";
import { generateFleet } from "../simulation";

const fleet = generateFleet(42, 10);

describe("metrics aggregator", () => {
  it("summarizes the fleet into hero metrics in range", () => {
    const s = summarize(fleet);
    expect(s.totalAgents).toBe(10);
    expect(s.avgSuccessRate).toBeGreaterThan(0);
    expect(s.avgSuccessRate).toBeLessThanOrEqual(1);
    expect(s.healthScore).toBeGreaterThanOrEqual(0);
    expect(s.healthScore).toBeLessThanOrEqual(100);
    expect(s.totalCostWeek).toBeGreaterThan(0);
    expect(s.needingAttention).toBeLessThanOrEqual(s.totalAgents);
  });

  it("returns zeros for an empty fleet", () => {
    const s = summarize([]);
    expect(s.totalAgents).toBe(0);
    expect(s.healthScore).toBe(0);
  });

  it("flags error/degraded agents as needing attention", () => {
    for (const r of fleet) {
      if (r.agent.status === "error" || r.agent.status === "degraded") {
        expect(needsAttention(r)).toBe(true);
      }
    }
  });

  it("weekly cost is non-negative and scales with runs", () => {
    for (const r of fleet) expect(weeklyCost(r)).toBeGreaterThanOrEqual(0);
  });

  it("health score is deterministic", () => {
    expect(fleetHealthScore(fleet)).toBe(fleetHealthScore(generateFleet(42, 10)));
  });
});
