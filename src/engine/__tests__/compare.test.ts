import { describe, expect, it } from "vitest";
import { compare, AXES } from "../compare";
import { generateFleet } from "../simulation";

const fleet = generateFleet(42, 10);

describe("comparison engine", () => {
  it("compares 2-6 agents and rejects anything outside that range", () => {
    expect(() => compare(fleet.slice(0, 1))).toThrow(/2-6/);
    expect(() => compare(fleet.slice(0, 7))).toThrow(/2-6/);
    expect(compare(fleet.slice(0, 4)).agentIds).toHaveLength(4);
  });

  it("scores every axis 0..1 with higher = better, and inverts cost/latency", () => {
    const cmp = compare(fleet.slice(0, 4));
    expect(cmp.axes).toHaveLength(AXES.length);
    for (const ax of cmp.axes) {
      for (const v of Object.values(ax.scores)) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
      // the axis winner has rank 1
      expect(ax.ranks[ax.winnerId]).toBe(1);
    }
  });

  it("the cheapest agent wins the cost axis (inverted)", () => {
    const recs = fleet.slice(0, 4);
    const cmp = compare(recs);
    const costAxis = cmp.axes.find((a) => a.axis === "costPerRun")!;
    const cheapest = [...recs].sort((a, b) => a.metrics.costPerRun - b.metrics.costPerRun)[0]!;
    expect(costAxis.winnerId).toBe(cheapest.agent.id);
  });

  it("produces an overall winner and a best-for map", () => {
    const cmp = compare(fleet.slice(0, 5));
    expect(cmp.agentIds).toContain(cmp.overallWinnerId);
    expect(Object.keys(cmp.bestFor).length).toBe(AXES.length);
  });

  it("is deterministic", () => {
    expect(compare(fleet.slice(0, 4))).toEqual(compare(generateFleet(42, 10).slice(0, 4)));
  });
});
