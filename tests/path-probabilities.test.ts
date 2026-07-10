import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  enrichPathWithProbabilities,
  getFullBracketPath,
} from '@/lib/engine/path-logic';

test('official path probabilities retain their count and effective match denominator', () => {
  const path = enrichPathWithProbabilities('USA', getFullBracketPath('D', 1));
  const estimates = path.flatMap(node => node.opponents).filter(
    opponent => opponent.probability != null,
  );

  assert.ok(estimates.length > 0);
  for (const opponent of estimates) {
    assert.ok(opponent.probabilityCount != null);
    assert.ok(opponent.probabilityTrials != null);
    assert.ok(opponent.probabilityTrials > 0);
    assert.ok(opponent.probabilityCount >= 0);
    assert.equal(
      opponent.probability,
      (opponent.probabilityCount / opponent.probabilityTrials) * 100,
    );
  }
});
