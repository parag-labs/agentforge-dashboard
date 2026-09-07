import { describe, expect, it } from "vitest";
import { fleetInsights, comparisonInsights } from "../insights";
import { compare } from "../compare";
import { generateFleet } from "../simulation";

const fleet = generateFleet(42, 10);

describe("insights generator", () => {
  it("produces grounded fleet insights that name real agents", () => {
    const insights = fleetInsights(fleet);
    expect(insights.length).toBeGreaterThan(0);
    const names = fleet.map((r) => r.agent.name);
    for (const i of insights) {
      expect(i.text.length).toBeGreaterThan(0);
      // each fleet insight references at least one real agent or a count
      const mentionsAgent = names.some((n) => i.text.includes(n));
      expect(mentionsAgent || /\d/.test(i.text)).toBe(true);
    }
  });

  it("produces a comparison recommendation naming the overall winner", () => {
    const recs = fleet.slice(0, 4);
    const cmp = compare(recs);
    const insights = comparisonInsights(cmp, recs);
    const winnerName = recs.find((r) => r.agent.id === cmp.overallWinnerId)!.agent.name;
    expect(insights.some((i) => i.kind === "recommendation" && i.text.includes(winnerName))).toBe(true);
  });

  it("is deterministic", () => {
    expect(fleetInsights(fleet)).toEqual(fleetInsights(generateFleet(42, 10)));
  });

  it("handles an empty fleet without throwing", () => {
    expect(fleetInsights([])).toEqual([]);
  });
});
