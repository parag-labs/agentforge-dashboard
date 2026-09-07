import { describe, expect, it } from "vitest";
import { buildMap } from "../map";
import { generateFleet } from "../simulation";
import { evaluate } from "../evaluate";

const fleet = generateFleet(42, 10);

describe("agent map", () => {
  it("creates a node per agent", () => {
    expect(buildMap(fleet).nodes).toHaveLength(fleet.length);
  });

  it("links agents that share tools, with a weight", () => {
    const map = buildMap(fleet);
    for (const e of map.edges) {
      expect(e.weight).toBeGreaterThanOrEqual(1);
      expect(e.sharedTools.length).toBe(e.weight);
    }
  });

  it("raising minShared reduces or keeps the edge count", () => {
    expect(buildMap(fleet, 2).edges.length).toBeLessThanOrEqual(buildMap(fleet, 1).edges.length);
  });
});

describe("evaluation harness", () => {
  it("passes all deterministic checks with zero ungrounded insights", () => {
    const r = evaluate();
    expect(r.invalidInsights).toBe(0);
    expect(r.simulationReproducible).toBe(true);
    expect(r.intentReproducible).toBe(true);
    expect(r.agents).toBe(10);
    expect(r.healthScore).toBeGreaterThan(0);
  });
});
