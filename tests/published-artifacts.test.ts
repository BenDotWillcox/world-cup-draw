import assert from 'node:assert/strict';
import { test } from 'node:test';
import preDrawJson from '@/lib/data/pre-draw-monte-carlo.json';
import preDrawCompatibilityJson from '@/lib/data/monte-carlo-results.json';
import tournamentJson from '@/lib/data/tournament-sim-results.json';
import { SIMULATION_SCHEMA_VERSION, type SimulationMetadata } from '@/lib/data/simulation-metadata';
import { TEAMS } from '@/lib/data/teams';
import { hashInputFiles } from '@/lib/input-snapshot';

interface CountedArtifact {
  metadata: SimulationMetadata;
  iterations: number;
  attempts: number;
  rejectedIterations: number;
}

type PreDrawArtifact = CountedArtifact & {
  groupProbabilities: Record<string, Record<string, number>>;
  opponentCounts: Record<string, Record<string, number>>;
};

type TournamentArtifact = CountedArtifact & {
  groupFinish: Record<string, Record<string, number>>;
  roundReach: Record<string, Record<string, number>>;
};

const preDraw = preDrawJson as unknown as PreDrawArtifact;
const tournament = tournamentJson as unknown as TournamentArtifact;

test('published pre-draw artifacts are identical and satisfy their count contract', () => {
  assert.deepEqual(preDrawJson, preDrawCompatibilityJson);
  validateMetadata(preDraw);

  for (const team of TEAMS) {
    assert.equal(sum(Object.values(preDraw.groupProbabilities[team.id])), preDraw.iterations);
    assert.equal(sum(Object.values(preDraw.opponentCounts[team.id])), preDraw.iterations * 3);

    for (const opponent of TEAMS.filter(candidate => candidate.pot === team.pot)) {
      if (opponent.id !== team.id) {
        assert.equal(preDraw.opponentCounts[team.id][opponent.id], 0);
      }
    }
  }
});

test('published tournament artifact satisfies metadata and aggregate totals', () => {
  validateMetadata(tournament);

  for (const team of TEAMS) {
    assert.equal(sum(Object.values(tournament.groupFinish[team.id])), tournament.iterations);
  }

  const expectedRoundTotals: Record<string, number> = {
    R32: 32,
    R16: 16,
    QF: 8,
    SF: 4,
    F: 2,
    W: 1,
  };
  for (const [round, teamsPerTrial] of Object.entries(expectedRoundTotals)) {
    const total = sum(TEAMS.map(team => tournament.roundReach[team.id][round] ?? 0));
    assert.equal(total, tournament.iterations * teamsPerTrial);
  }
});

function validateMetadata(artifact: CountedArtifact) {
  const { metadata } = artifact;
  assert.equal(metadata.schemaVersion, SIMULATION_SCHEMA_VERSION);
  assert.equal(metadata.trials, artifact.iterations);
  assert.equal(sum(metadata.convergence.batchTrials), artifact.iterations);
  assert.equal(artifact.attempts, artifact.iterations + artifact.rejectedIterations);
  assert.equal(metadata.inputSnapshot.sha256, hashInputFiles(metadata.inputSnapshot.files));
  assert.ok(metadata.rulesSource.startsWith('https://'));
  assert.ok(Number.isFinite(metadata.convergence.maxAbsoluteDeltaPercentagePoints));
  assert.equal(metadata.convergence.passed, true);
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}
