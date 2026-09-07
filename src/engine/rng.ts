/**
 * A tiny deterministic PRNG (mulberry32) plus helpers. The whole simulation is seeded, so the
 * dashboard shows the same "living" fleet every run and the tests/eval are reproducible. Nothing
 * here uses Math.random().
 */

export type Rng = () => number;

/** Create a seeded RNG. The same seed always yields the same stream. */
export function rng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Uniform float in [min, max). */
export function between(r: Rng, min: number, max: number): number {
  return min + r() * (max - min);
}

/** Integer in [min, max]. */
export function intBetween(r: Rng, min: number, max: number): number {
  return Math.floor(between(r, min, max + 1));
}

/** Pick one element deterministically. */
export function pick<T>(r: Rng, items: readonly T[]): T {
  return items[Math.floor(r() * items.length)] ?? items[0]!;
}

/** Pick `n` distinct elements deterministically. */
export function sample<T>(r: Rng, items: readonly T[], n: number): T[] {
  const pool = [...items];
  const out: T[] = [];
  for (let i = 0; i < n && pool.length > 0; i++) {
    const idx = Math.floor(r() * pool.length);
    out.push(pool.splice(idx, 1)[0]!);
  }
  return out;
}

/** Round to a fixed number of decimals. */
export function round(n: number, dp = 2): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}
