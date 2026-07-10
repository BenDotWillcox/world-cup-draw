import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { runFastSimulation } from '@/lib/engine/fast-sim';
import { createSeededRandom } from '@/lib/engine/random';
import { runTournamentSimulation } from '@/lib/engine/tournament-sim';

const sha256 = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

test('fixed-seed pre-draw golden output is stable', () => {
  const result = runFastSimulation(250, createSeededRandom('golden-draw-v1'));

  assert.equal(result.iterations, 250);
  assert.equal(
    sha256(result),
    'b48821c38aa23621d62ec559956ae2dab5189adb084555d8524f4cca4c63bf80',
  );
});

test('fixed-seed official-draw tournament golden output is stable', () => {
  const result = runTournamentSimulation(200, createSeededRandom('golden-tournament-v1'));

  assert.equal(result.iterations, 200);
  assert.equal(result.attempts, result.iterations + result.rejectedIterations);
  assert.equal(
    sha256(result),
    'da46a86e6eb05a2774bc4d8d27753bd4db3f3e42303298c840e021d2aaa6ebbe',
  );
});
