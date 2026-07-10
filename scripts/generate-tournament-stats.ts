import {
  DEFAULT_TRIALS,
  TOURNAMENT_SIMULATION_SEED,
} from '../lib/data/simulation-metadata';
import { createSeededRandom } from '../lib/engine/random';
import { runTournamentSimulation } from '../lib/engine/tournament-sim';
import {
  calculateConvergence,
  createMetadata,
  mergeCountTrees,
  parseGeneratorArguments,
  splitTrials,
  writeJson,
} from './simulation-reporting';

const INPUT_FILES = [
  'lib/data/elo-ratings.ts',
  'lib/data/knockout-schedule.ts',
  'lib/data/official-draw.ts',
  'lib/data/teams.ts',
  'lib/data/third-place-combinations.ts',
  'lib/engine/random.ts',
  'lib/engine/tournament-sim.ts',
  'types/draw.ts',
];

async function main() {
  const { seed, trials } = parseGeneratorArguments(TOURNAMENT_SIMULATION_SEED, DEFAULT_TRIALS);
  const batchSeeds = [`${seed}:batch-1`, `${seed}:batch-2`];
  const [firstTrials, secondTrials] = splitTrials(trials);

  console.log(`Running seeded official-draw tournament simulation (${trials.toLocaleString()} trials, seed ${seed})...`);
  const start = Date.now();

  const first = runTournamentSimulation(firstTrials, createSeededRandom(batchSeeds[0]));
  const second = runTournamentSimulation(secondTrials, createSeededRandom(batchSeeds[1]));
  const convergence = calculateConvergence(
    [first.groupFinish, first.roundReach, first.roundOpponents, first.matchOpponents],
    [second.groupFinish, second.roundReach, second.roundOpponents, second.matchOpponents],
    firstTrials,
    secondTrials,
  );

  const result = {
    metadata: createMetadata({
      kind: 'official-draw-tournament',
      seed,
      trials,
      batchSeeds,
      inputFiles: INPUT_FILES,
      convergence,
      reproducibleCommand: `npm run generate:tournament-stats -- --seed ${JSON.stringify(seed)} --trials ${trials}`,
    }),
    groupFinish: mergeCountTrees(first.groupFinish, second.groupFinish),
    roundReach: mergeCountTrees(first.roundReach, second.roundReach),
    roundOpponents: mergeCountTrees(first.roundOpponents, second.roundOpponents),
    matchOpponents: mergeCountTrees(first.matchOpponents, second.matchOpponents),
    iterations: first.iterations + second.iterations,
    attempts: first.attempts + second.attempts,
    rejectedIterations: first.rejectedIterations + second.rejectedIterations,
  };

  const output = writeJson('lib/data/tournament-sim-results.json', result);
  const seconds = ((Date.now() - start) / 1000).toFixed(2);
  const usa = result.roundReach.USA;

  console.log(`Simulation complete in ${seconds}s after ${result.attempts.toLocaleString()} attempts.`);
  console.log(
    `USA reach rates: R32=${((usa.R32 / trials) * 100).toFixed(1)}% ` +
      `R16=${((usa.R16 / trials) * 100).toFixed(1)}% ` +
      `QF=${((usa.QF / trials) * 100).toFixed(1)}% ` +
      `SF=${((usa.SF / trials) * 100).toFixed(1)}% ` +
      `F=${((usa.F / trials) * 100).toFixed(1)}% W=${((usa.W / trials) * 100).toFixed(1)}%`,
  );
  console.log(
    `Split-half max delta: ${convergence.maxAbsoluteDeltaPercentagePoints.toFixed(3)} pp ` +
      `(threshold ${convergence.thresholdPercentagePoints.toFixed(3)} pp; ${convergence.passed ? 'PASS' : 'FAIL'}).`,
  );
  console.log(`Results written to ${output}`);

  if (!convergence.passed) process.exitCode = 1;
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
