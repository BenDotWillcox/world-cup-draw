import { DEFAULT_TRIALS, PRE_DRAW_SIMULATION_SEED } from '../lib/data/simulation-metadata';
import { runFastSimulation } from '../lib/engine/fast-sim';
import { createSeededRandom } from '../lib/engine/random';
import {
  calculateConvergence,
  createMetadata,
  mergeCountTrees,
  parseGeneratorArguments,
  splitTrials,
  writeJson,
} from './simulation-reporting';

const INPUT_FILES = [
  'lib/data/teams.ts',
  'lib/engine/fast-sim.ts',
  'lib/engine/random.ts',
  'types/draw.ts',
];

async function main() {
  const { seed, trials } = parseGeneratorArguments(PRE_DRAW_SIMULATION_SEED, DEFAULT_TRIALS);
  const batchSeeds = [`${seed}:batch-1`, `${seed}:batch-2`];
  const [firstTrials, secondTrials] = splitTrials(trials);

  console.log(`Running seeded pre-draw simulation (${trials.toLocaleString()} trials, seed ${seed})...`);
  const start = Date.now();

  const first = runFastSimulation(firstTrials, createSeededRandom(batchSeeds[0]));
  const second = runFastSimulation(secondTrials, createSeededRandom(batchSeeds[1]));
  const groupProbabilities = mergeCountTrees(first.groupProbabilities, second.groupProbabilities);
  const opponentCounts = mergeCountTrees(first.opponentCounts, second.opponentCounts);
  const convergence = calculateConvergence(
    [first.groupProbabilities, first.opponentCounts],
    [second.groupProbabilities, second.opponentCounts],
    firstTrials,
    secondTrials,
  );

  const result = {
    metadata: createMetadata({
      kind: 'pre-draw',
      seed,
      trials,
      batchSeeds,
      inputFiles: INPUT_FILES,
      convergence,
      reproducibleCommand: `npm run generate:draw-stats -- --seed ${JSON.stringify(seed)} --trials ${trials}`,
    }),
    iterations: first.iterations + second.iterations,
    attempts: first.attempts + second.attempts,
    rejectedIterations: first.rejectedIterations + second.rejectedIterations,
    groupProbabilities,
    opponentCounts,
  };

  const outputs = [
    writeJson('lib/data/pre-draw-monte-carlo.json', result),
    writeJson('lib/data/monte-carlo-results.json', result),
  ];
  const seconds = ((Date.now() - start) / 1000).toFixed(2);

  console.log(`Simulation complete in ${seconds}s after ${result.attempts.toLocaleString()} attempts.`);
  console.log(
    `Split-half max delta: ${convergence.maxAbsoluteDeltaPercentagePoints.toFixed(3)} pp ` +
      `(threshold ${convergence.thresholdPercentagePoints.toFixed(3)} pp; ${convergence.passed ? 'PASS' : 'FAIL'}).`,
  );
  outputs.forEach(output => console.log(`Results written to ${output}`));

  if (!convergence.passed) process.exitCode = 1;
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
