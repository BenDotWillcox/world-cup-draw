export type VisualDrawSeedSource = 'automatic' | 'custom' | 'shared';

let fallbackSeedCounter = 0;

/**
 * Creates a short, user-shareable seed for a new interactive draw.
 * Web Crypto is preferred; the counter fallback still prevents repeated seeds
 * in older runtimes that do not expose it.
 */
export function createFreshVisualDrawSeed(): string {
  const values = new Uint32Array(2);

  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(values);
  } else {
    fallbackSeedCounter = (fallbackSeedCounter + 1) >>> 0;
    values[0] = Date.now() >>> 0;
    values[1] = fallbackSeedCounter;
  }

  return `wc26-visual-${Date.now().toString(36)}-${values[0].toString(36)}${values[1].toString(36)}`;
}

export function resolveVisualDrawSeed(
  configuredSeed: string,
  source: VisualDrawSeedSource,
  createFreshSeed: () => string = createFreshVisualDrawSeed,
): string {
  const normalizedSeed = configuredSeed.trim();
  return source === 'automatic' || !normalizedSeed ? createFreshSeed() : normalizedSeed;
}

export function shouldPreserveVisualDrawSeed(source: VisualDrawSeedSource): boolean {
  return source !== 'automatic';
}
