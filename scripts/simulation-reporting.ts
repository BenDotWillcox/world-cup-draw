import fs from 'node:fs';
import path from 'node:path';
import {
  DRAW_INPUT_VERSION,
  ELO_INPUT_VERSION,
  ELO_SOURCE_URL,
  OFFICIAL_DRAW_VERSION,
  RULES_VERSION,
  RULES_SOURCE_URL,
  SIMULATION_SCHEMA_VERSION,
  TOURNAMENT_MODEL_VERSION,
  TOURNAMENT_RULES_SOURCE_URL,
  TOURNAMENT_RULES_VERSION,
  type ConvergenceEvidence,
  type SimulationKind,
  type SimulationMetadata,
} from '../lib/data/simulation-metadata';
import { hashInputFiles } from '../lib/input-snapshot';
import { getWorstCaseUncertainty } from '../lib/statistics/uncertainty';

export interface GeneratorArguments {
  seed: string;
  trials: number;
}

export function parseGeneratorArguments(
  defaultSeed: string,
  defaultTrials: number,
): GeneratorArguments {
  const args = process.argv.slice(2);
  let seed = defaultSeed;
  let trials = defaultTrials;

  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if (argument.startsWith('--seed=')) {
      seed = argument.slice('--seed='.length);
    } else if (argument === '--seed') {
      seed = args[++index] ?? '';
    } else if (argument.startsWith('--trials=')) {
      trials = Number(argument.slice('--trials='.length));
    } else if (argument === '--trials') {
      trials = Number(args[++index]);
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  if (!seed.trim()) throw new Error('The seed must not be empty.');
  if (!Number.isSafeInteger(trials) || trials < 2) {
    throw new Error('Trials must be a safe integer of at least 2 for the split-half check.');
  }

  return { seed, trials };
}

export function splitTrials(trials: number): [number, number] {
  const first = Math.floor(trials / 2);
  return [first, trials - first];
}

export function mergeCountTrees<T>(first: T, second: unknown): T {
  return mergeCountTreeValues(first, second) as T;
}

function mergeCountTreeValues(first: unknown, second: unknown): unknown {
  if (typeof first === 'number' && typeof second === 'number') {
    return first + second;
  }

  if (isRecord(first) && isRecord(second)) {
    const result: Record<string, unknown> = {};
    const keys = new Set([...Object.keys(first), ...Object.keys(second)]);
    for (const key of keys) {
      result[key] = mergeCountTreeValues(first[key], second[key]);
    }
    return result;
  }

  if (first === undefined) return cloneCountTree(second);
  if (second === undefined) return cloneCountTree(first);

  throw new Error('Cannot merge simulation trees with different shapes.');
}

export function calculateConvergence(
  firstTrees: unknown[],
  secondTrees: unknown[],
  firstTrials: number,
  secondTrials: number,
  thresholdPercentagePoints = 0.5,
): ConvergenceEvidence {
  if (firstTrees.length !== secondTrees.length) {
    throw new Error('Convergence tree collections must have the same length.');
  }

  let metricsCompared = 0;
  let maxAbsoluteDeltaPercentagePoints = 0;

  const visit = (first: unknown, second: unknown) => {
    if (typeof first === 'number' && typeof second === 'number') {
      const delta = Math.abs(first / firstTrials - second / secondTrials) * 100;
      metricsCompared++;
      maxAbsoluteDeltaPercentagePoints = Math.max(maxAbsoluteDeltaPercentagePoints, delta);
      return;
    }

    if (isRecord(first) && isRecord(second)) {
      const keys = new Set([...Object.keys(first), ...Object.keys(second)]);
      for (const key of keys) visit(first[key] ?? 0, second[key] ?? 0);
      return;
    }

    if (first === 0 && isRecord(second)) {
      for (const child of Object.values(second)) visit(0, child);
      return;
    }

    if (second === 0 && isRecord(first)) {
      for (const child of Object.values(first)) visit(child, 0);
      return;
    }

    throw new Error('Cannot compare simulation trees with different shapes.');
  };

  firstTrees.forEach((tree, index) => visit(tree, secondTrees[index]));

  return {
    method: 'split-half-max-absolute-difference',
    batchTrials: [firstTrials, secondTrials],
    metricsCompared,
    maxAbsoluteDeltaPercentagePoints,
    thresholdPercentagePoints,
    passed: maxAbsoluteDeltaPercentagePoints <= thresholdPercentagePoints,
  };
}

export function createMetadata(options: {
  kind: SimulationKind;
  seed: string;
  trials: number;
  batchSeeds: string[];
  inputFiles: string[];
  convergence: ConvergenceEvidence;
  reproducibleCommand: string;
}): SimulationMetadata {
  const uncertainty = getWorstCaseUncertainty(options.trials);
  const isTournament = options.kind === 'official-draw-tournament';

  return {
    schemaVersion: SIMULATION_SCHEMA_VERSION,
    kind: options.kind,
    generatedAt: new Date().toISOString(),
    seed: options.seed,
    rng: 'fnv1a-mulberry32-v1',
    batchSeeds: options.batchSeeds,
    trials: options.trials,
    rulesVersion: isTournament ? TOURNAMENT_RULES_VERSION : RULES_VERSION,
    rulesSource: isTournament ? TOURNAMENT_RULES_SOURCE_URL : RULES_SOURCE_URL,
    ...(isTournament ? { modelVersion: TOURNAMENT_MODEL_VERSION } : {}),
    inputSnapshot: {
      version: isTournament ? OFFICIAL_DRAW_VERSION : DRAW_INPUT_VERSION,
      sha256: hashInputFiles(options.inputFiles),
      files: options.inputFiles,
    },
    ...(isTournament
      ? {
          elo: {
            source: ELO_SOURCE_URL,
            version: ELO_INPUT_VERSION,
            capturedAt: '2026-04-02',
          },
        }
      : {}),
    uncertainty: {
      method: 'binomial-standard-error-and-wilson-95',
      confidenceLevel: 0.95,
      worstCaseStandardErrorPercentagePoints: uncertainty.standardErrorPercentagePoints,
      worstCaseMarginOfError95PercentagePoints: uncertainty.marginOfError95PercentagePoints,
    },
    convergence: options.convergence,
    reproducibleCommand: options.reproducibleCommand,
  };
}

export function writeJson(relativePath: string, value: unknown) {
  const outputPath = path.join(process.cwd(), relativePath);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(value, null, 2)}\n`);
  return outputPath;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cloneCountTree(value: unknown): unknown {
  if (typeof value === 'number') return value;
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, cloneCountTree(child)]),
    );
  }
  throw new Error('Simulation count trees may contain only records and numbers.');
}
