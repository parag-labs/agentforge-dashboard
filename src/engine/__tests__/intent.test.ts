import { describe, expect, it } from "vitest";
import { parseIntent, applyIntent } from "../intent";
import { generateFleet } from "../simulation";

const fleet = generateFleet(42, 10);

describe("intent parser", () => {
  it("parses an 'expensive agents' intent into a cost sort", () => {
    const intent = parseIntent("show me expensive agents");
    expect(intent.sort).toEqual({ by: "cost", dir: "desc" });
  });

  it("parses 'healthy only' into a status filter", () => {
    const intent = parseIntent("healthy only");
    expect(intent.filters.status).toBe("healthy");
    const out = applyIntent(intent, fleet);
    expect(out.every((r) => r.agent.status === "healthy")).toBe(true);
  });

  it("parses a compare intent", () => {
    expect(parseIntent("compare my research agents").action).toBe("compare");
  });

  it("parses attention intent", () => {
    const intent = parseIntent("which agents need attention?");
    expect(intent.filters.needsAttention).toBe(true);
  });

  it("extracts a keyword filter", () => {
    const intent = parseIntent("show research agents");
    expect(intent.filters.text).toBe("research");
  });

  it("applies a keyword filter that matches a capability in the fleet", () => {
    // Derive a keyword guaranteed to exist (the simulation samples a subset of archetypes).
    const cap = fleet[0]!.agent.capabilities[0]!;
    const intent = parseIntent(`show ${cap} agents`);
    const out = applyIntent(intent, fleet);
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((r) => r.agent.name.toLowerCase().includes(intent.filters.text!) || r.agent.capabilities.some((c) => c.includes(intent.filters.text!)) || r.agent.tags.some((g) => g.includes(intent.filters.text!)) || r.agent.tools.some((t) => t.includes(intent.filters.text!)))).toBe(true);
  });

  it("sorts by cost descending puts the priciest first", () => {
    const out = applyIntent(parseIntent("most expensive agents"), fleet);
    for (let i = 1; i < out.length; i++) {
      expect(out[i - 1]!.metrics.costPerRun).toBeGreaterThanOrEqual(out[i]!.metrics.costPerRun);
    }
  });

  it("always returns a usable summary", () => {
    expect(parseIntent("").summary.length).toBeGreaterThan(0);
    expect(parseIntent("gibberish xyz").summary.length).toBeGreaterThan(0);
  });
});
