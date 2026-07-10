export const SIMULATION_SCHEMA_VERSION = 3;
export const DEFAULT_TRIALS = 1_000_000;

export const RULES_VERSION = 'fifa-final-draw-2025-11-25';
export const TOURNAMENT_RULES_VERSION = 'fifa-world-cup-26-regulations-2026-05';
export const TOURNAMENT_MODEL_VERSION = 'elo-points-annexe-c-v2';
export const DRAW_INPUT_VERSION = 'fifa-pots-2025-11-19-reconciled-2026-04-02';
export const OFFICIAL_DRAW_VERSION = 'fifa-final-draw-2025-12-05-reconciled-2026-04-02';
export const ELO_INPUT_VERSION = 'world-football-elo-captured-2026-04-02';

export const DEFAULT_VISUAL_DRAW_SEED = 'wc26-visual-draw-v1';
export const VISUAL_DRAW_ENGINE_VERSION = 'interactive-backtracking-v2';
export const PRE_DRAW_SIMULATION_SEED = 'wc26-pre-draw-2026-07-10-v1';
export const TOURNAMENT_SIMULATION_SEED = 'wc26-tournament-2026-07-10-v1';

export const RULES_SOURCE_URL =
  'https://digitalhub.fifa.com/m/2d1a1ac7bab78995/original/Draw-Procedures-for-the-FIFA-World-Cup-2026.pdf';
export const TOURNAMENT_RULES_SOURCE_URL =
  'https://digitalhub.fifa.com/m/636f5c9c6f29771f/original/FWC2026_regulations_EN.pdf';
export const OFFICIAL_DRAW_SOURCE_URL =
  'https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/final-draw-results';
export const ELO_SOURCE_URL = 'https://eloratings.net/';

export type SimulationKind = 'pre-draw' | 'official-draw-tournament';

export interface ConvergenceEvidence {
  method: 'split-half-max-absolute-difference';
  batchTrials: number[];
  metricsCompared: number;
  maxAbsoluteDeltaPercentagePoints: number;
  thresholdPercentagePoints: number;
  passed: boolean;
}

export interface SimulationMetadata {
  schemaVersion: number;
  kind: SimulationKind;
  generatedAt: string;
  seed: string;
  rng: 'fnv1a-mulberry32-v1';
  batchSeeds: string[];
  trials: number;
  rulesVersion: string;
  rulesSource: string;
  modelVersion?: string;
  inputSnapshot: {
    version: string;
    sha256: string;
    files: string[];
  };
  elo?: {
    source: string;
    version: string;
    capturedAt: string;
  };
  uncertainty: {
    method: 'binomial-standard-error-and-wilson-95';
    confidenceLevel: 0.95;
    worstCaseStandardErrorPercentagePoints: number;
    worstCaseMarginOfError95PercentagePoints: number;
  };
  convergence: ConvergenceEvidence;
  reproducibleCommand: string;
}
