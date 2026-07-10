import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculateConvergence, mergeCountTrees } from '@/scripts/simulation-reporting';

test('count-tree merging preserves asymmetric sparse branches', () => {
  const first = {
    USA: {
      M81: { ARG: 2 },
    },
  };
  const second = {
    USA: {
      M81: { BRA: 3 },
      M97: { ESP: 1 },
    },
  };

  assert.deepEqual(mergeCountTrees(first, second), {
    USA: {
      M81: { ARG: 2, BRA: 3 },
      M97: { ESP: 1 },
    },
  });
});

test('split-half convergence compares sparse count-tree leaves', () => {
  const convergence = calculateConvergence(
    [{ USA: { M81: { ARG: 2 } } }],
    [{ USA: { M81: { ARG: 3, BRA: 1 }, M97: { ESP: 1 } } }],
    100,
    100,
    1,
  );

  assert.equal(convergence.metricsCompared, 3);
  assert.equal(convergence.maxAbsoluteDeltaPercentagePoints, 1);
  assert.equal(convergence.passed, true);
});
