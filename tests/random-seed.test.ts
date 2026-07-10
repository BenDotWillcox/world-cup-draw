import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createFreshVisualDrawSeed,
  resolveVisualDrawSeed,
  shouldPreserveVisualDrawSeed,
} from '@/lib/visual-draw-seed';
import { createSeededRandom } from '@/lib/engine/random';

test('fresh visual-draw seeds are short, valid, and distinct', () => {
  const seeds = Array.from({ length: 32 }, () => createFreshVisualDrawSeed());

  assert.equal(new Set(seeds).size, seeds.length);
  for (const seed of seeds) {
    assert.match(seed, /^wc26-visual-[a-z0-9]+-[a-z0-9]+$/);
    assert.ok(seed.length <= 128);
  }
});

test('a generated seed can still reproduce a random stream exactly', () => {
  const seed = createFreshVisualDrawSeed();
  const first = createSeededRandom(seed);
  const replay = createSeededRandom(seed);

  assert.deepEqual(
    Array.from({ length: 12 }, () => first()),
    Array.from({ length: 12 }, () => replay()),
  );
});

test('visual-draw seed policy refreshes automatic runs and preserves deliberate replay seeds', () => {
  let freshSeedIndex = 0;
  const createFreshSeed = () => `fresh-${++freshSeedIndex}`;

  assert.equal(resolveVisualDrawSeed('old-auto-seed', 'automatic', createFreshSeed), 'fresh-1');
  assert.equal(resolveVisualDrawSeed('old-auto-seed', 'automatic', createFreshSeed), 'fresh-2');
  assert.equal(resolveVisualDrawSeed(' custom-seed ', 'custom', createFreshSeed), 'custom-seed');
  assert.equal(resolveVisualDrawSeed(' shared-seed ', 'shared', createFreshSeed), 'shared-seed');

  assert.equal(shouldPreserveVisualDrawSeed('automatic'), false);
  assert.equal(shouldPreserveVisualDrawSeed('custom'), true);
  assert.equal(shouldPreserveVisualDrawSeed('shared'), true);
});
