/**
 * The public surface for the AgentForge engine: the seeded RNG, domain types, the simulation
 * engine, the metrics aggregator, the comparison engine, the insights generator, the intent
 * parser, the relationship map, and the evaluation harness. The UI depends only on this barrel.
 */

export * from "./rng";
export * from "./types";
export * from "./simulation";
export * from "./aggregate";
export * from "./compare";
export * from "./insights";
export * from "./intent";
export * from "./map";
export * from "./evaluate";
