import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { SimulationMetadata } from '@/lib/data/simulation-metadata';
import {
  createDrawExport,
  createDrawShareUrl,
  createUnsharedDrawUrl,
  drawToCsv,
  probabilitiesToCsv,
} from '@/lib/export-data';
import type { Group, Team } from '@/types/draw';

const team: Team = {
  id: 'T1',
  name: 'Team, "One"',
  confederation: 'UEFA',
  rank: 1,
  pot: 1,
};

const groups: Group[] = [
  { name: 'A', teams: [team, null, null, null] },
];

const metadata: SimulationMetadata = {
  schemaVersion: 3,
  kind: 'pre-draw',
  generatedAt: '2026-07-10T00:00:00.000Z',
  seed: 'seed,one',
  rng: 'fnv1a-mulberry32-v1',
  batchSeeds: ['a', 'b'],
  trials: 100,
  rulesVersion: 'rules-v1',
  rulesSource: 'https://example.test/rules',
  inputSnapshot: { version: 'input-v1', sha256: 'abc', files: ['input.ts'] },
  uncertainty: {
    method: 'binomial-standard-error-and-wilson-95',
    confidenceLevel: 0.95,
    worstCaseStandardErrorPercentagePoints: 5,
    worstCaseMarginOfError95PercentagePoints: 9.8,
  },
  convergence: {
    method: 'split-half-max-absolute-difference',
    batchTrials: [50, 50],
    metricsCompared: 1,
    maxAbsoluteDeltaPercentagePoints: 0,
    thresholdPercentagePoints: 0.5,
    passed: true,
  },
  reproducibleCommand: 'npm run generate',
};

test('draw exports distinguish seeded and official scenarios and escape CSV', () => {
  const visual = createDrawExport(groups, 'seed,one', 'visual-seeded-draw');
  const official = createDrawExport(groups, 'ignored', 'official-draw');
  const csv = drawToCsv(groups, 'seed,one', 'visual-seeded-draw');

  assert.equal(visual.metadata.scenario, 'visual-seeded-draw');
  assert.equal(visual.metadata.seed, 'seed,one');
  assert.equal(visual.metadata.complete, false);
  assert.equal(official.metadata.scenario, 'official-draw');
  assert.equal(official.metadata.seed, null);
  assert.match(csv, /"Team, ""One"""/);
  assert.match(csv, /"seed,one"/);
});

test('share URLs round-trip seeded and official-draw configuration', () => {
  const seeded = createDrawShareUrl('https://example.test/app?tab=map', ' seed-one ', 'seeded');
  assert.equal(seeded.searchParams.get('tab'), 'visualizer');
  assert.equal(seeded.searchParams.get('scenario'), 'seeded');
  assert.equal(seeded.searchParams.get('seed'), 'seed-one');
  assert.ok(seeded.searchParams.get('rules'));
  assert.ok(seeded.searchParams.get('input'));
  assert.ok(seeded.searchParams.get('engine'));

  const official = createDrawShareUrl(seeded.toString(), 'ignored', 'official');
  assert.equal(official.searchParams.get('scenario'), 'official');
  assert.equal(official.searchParams.get('seed'), null);
  assert.equal(official.searchParams.get('engine'), null);
  assert.match(official.searchParams.get('input') ?? '', /official|final-draw/);

  assert.throws(
    () => createDrawShareUrl('https://example.test/app', '   ', 'seeded'),
    /non-empty seed/,
  );
});

test('unshared draw URLs remove replay configuration while preserving unrelated parameters', () => {
  const url = createUnsharedDrawUrl(
    'https://example.test/app?tab=map&scenario=seeded&seed=old-seed&rules=old-rules&input=old-input&engine=old-engine&theme=dark',
  );

  assert.equal(url.searchParams.get('tab'), 'visualizer');
  assert.equal(url.searchParams.get('theme'), 'dark');
  assert.equal(url.searchParams.get('scenario'), null);
  assert.equal(url.searchParams.get('seed'), null);
  assert.equal(url.searchParams.get('rules'), null);
  assert.equal(url.searchParams.get('input'), null);
  assert.equal(url.searchParams.get('engine'), null);
});

test('probability CSV uses the effective conditional denominator and includes provenance', () => {
  const probabilityMetadata = { ...metadata, seed: 'seed-one' };
  const csv = probabilitiesToCsv(
    {
      metadata: probabilityMetadata,
      iterations: 100,
      groupProbabilities: { T1: { A: 25 } },
      opponentCounts: { T1: {} },
    },
    {
      metadata: { ...probabilityMetadata, kind: 'official-draw-tournament', modelVersion: 'model-v1' },
      iterations: 100,
      groupFinish: { T1: { 1: 10 } },
      roundReach: { T1: { R32: 20 } },
      roundOpponents: { T1: { R32: { T2: 5 } } },
      matchOpponents: { T1: {} },
    },
    [team],
  );

  const [headerLine, ...dataLines] = csv.split('\n');
  const headers = headerLine.split(',');
  const conditional = dataLines
    .map(line => Object.fromEntries(headers.map((header, index) => [header, line.split(',')[index]])))
    .find(row => row.dataset === 'official-round-opponent-conditional');

  assert.ok(conditional);
  assert.equal(conditional.n, '20');
  assert.equal(conditional.estimatePct, '25');
  assert.equal(conditional.modelVersion, 'model-v1');
  assert.equal(conditional.rulesSource, 'https://example.test/rules');
});
