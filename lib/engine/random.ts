export type RandomSource = () => number;

/**
 * Stable, dependency-free pseudo-random number generator for reproducible runs.
 *
 * The string seed is first reduced with FNV-1a and then expanded with Mulberry32.
 * This is suitable for simulations and fixtures; it is not cryptographically secure.
 */
export function createSeededRandom(seed: string | number): RandomSource {
  let state = hashSeed(String(seed));

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function hashSeed(seed: string): number {
  let hash = 0x811c9dc5;

  for (let index = 0; index < seed.length; index++) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}
