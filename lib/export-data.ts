import type { SimulationMetadata } from '@/lib/data/simulation-metadata';
import {
  DRAW_INPUT_VERSION,
  OFFICIAL_DRAW_VERSION,
  RULES_VERSION,
  VISUAL_DRAW_ENGINE_VERSION,
} from '@/lib/data/simulation-metadata';
import { getBinomialEstimate } from '@/lib/statistics/uncertainty';
import type { Group, Team } from '@/types/draw';

interface PreDrawProbabilityArtifact {
  metadata: SimulationMetadata;
  iterations: number;
  groupProbabilities: Record<string, Record<string, number>>;
  opponentCounts: Record<string, Record<string, number>>;
}

interface TournamentProbabilityArtifact {
  metadata: SimulationMetadata;
  iterations: number;
  groupFinish: Record<string, Record<number, number>>;
  roundReach: Record<string, Record<string, number>>;
  roundOpponents: Record<string, Record<string, Record<string, number>>>;
  matchOpponents: Record<string, Record<string, Record<string, number>>>;
}

export type DrawExportScenario = 'visual-seeded-draw' | 'official-draw';
export type DrawShareScenario = 'seeded' | 'official';

export function createDrawShareUrl(
  currentUrl: string,
  seed: string,
  scenario: DrawShareScenario,
): URL {
  const url = new URL(currentUrl);
  const normalizedSeed = seed.trim();

  if (scenario === 'seeded' && !normalizedSeed) {
    throw new Error('A seeded draw configuration requires a non-empty seed.');
  }

  url.searchParams.set('tab', 'visualizer');
  url.searchParams.set('scenario', scenario);
  url.searchParams.set('rules', RULES_VERSION);

  if (scenario === 'official') {
    url.searchParams.set('input', OFFICIAL_DRAW_VERSION);
    url.searchParams.delete('seed');
    url.searchParams.delete('engine');
  } else {
    url.searchParams.set('seed', normalizedSeed);
    url.searchParams.set('input', DRAW_INPUT_VERSION);
    url.searchParams.set('engine', VISUAL_DRAW_ENGINE_VERSION);
  }

  return url;
}

export function createUnsharedDrawUrl(currentUrl: string): URL {
  const url = new URL(currentUrl);
  url.searchParams.set('tab', 'visualizer');

  for (const parameter of ['scenario', 'rules', 'input', 'seed', 'engine']) {
    url.searchParams.delete(parameter);
  }

  return url;
}

export function createDrawExport(groups: Group[], seed: string, scenario: DrawExportScenario) {
  return {
    metadata: {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      scenario,
      seed: scenario === 'visual-seeded-draw' ? seed : null,
      rulesVersion: RULES_VERSION,
      engineVersion: scenario === 'visual-seeded-draw' ? VISUAL_DRAW_ENGINE_VERSION : null,
      inputVersion: scenario === 'official-draw' ? OFFICIAL_DRAW_VERSION : DRAW_INPUT_VERSION,
      complete: groups.length === 12 && groups.every(
        group => group.teams.length === 4 && group.teams.every(Boolean),
      ),
    },
    groups: groups.map(group => ({
      name: group.name,
      teams: group.teams.map((team, index) => ({
        position: index + 1,
        teamId: team?.id ?? null,
        teamName: team?.name ?? null,
        pot: team?.pot ?? null,
        confederation: team?.confederation ?? null,
        potentialConfederations: team?.potentialConfederations ?? null,
      })),
    })),
  };
}

export function drawToCsv(groups: Group[], seed: string, scenario: DrawExportScenario): string {
  const rows: CsvValue[][] = [[
    'group',
    'position',
    'teamId',
    'teamName',
    'pot',
    'confederation',
    'potentialConfederations',
    'scenario',
    'seed',
    'rulesVersion',
    'engineVersion',
    'inputVersion',
  ]];

  for (const group of groups) {
    group.teams.forEach((team, index) => {
      rows.push([
        group.name,
        index + 1,
        team?.id ?? '',
        team?.name ?? '',
        team?.pot ?? '',
        team?.confederation ?? '',
        team?.potentialConfederations?.join('|') ?? '',
        scenario,
        scenario === 'visual-seeded-draw' ? seed : '',
        RULES_VERSION,
        scenario === 'visual-seeded-draw' ? VISUAL_DRAW_ENGINE_VERSION : '',
        scenario === 'official-draw' ? OFFICIAL_DRAW_VERSION : DRAW_INPUT_VERSION,
      ]);
    });
  }

  return rows.map(row => row.map(escapeCsvCell).join(',')).join('\n');
}

export function probabilitiesToCsv(
  preDraw: PreDrawProbabilityArtifact,
  tournament: TournamentProbabilityArtifact,
  teams: Team[],
): string {
  const rows: CsvValue[][] = [[
    'dataset',
    'teamId',
    'target',
    'count',
    'n',
    'estimatePct',
    'standardErrorPp',
    'ci95LowPct',
    'ci95HighPct',
    'sparse',
    'seed',
    'rng',
    'rulesVersion',
    'rulesSource',
    'modelVersion',
    'inputVersion',
    'inputSha256',
    'generatedAt',
  ]];

  const appendEstimate = (
    dataset: string,
    teamId: string,
    target: string,
    count: number,
    trials: number,
    metadata: SimulationMetadata,
  ) => {
    const estimate = getBinomialEstimate(count, trials);
    rows.push([
      dataset,
      teamId,
      target,
      count,
      trials,
      estimate.percentage,
      estimate.standardErrorPercentagePoints,
      estimate.confidenceInterval95.lowPercentage,
      estimate.confidenceInterval95.highPercentage,
      trials < 100 ? 'true' : 'false',
      metadata.seed,
      metadata.rng,
      metadata.rulesVersion,
      metadata.rulesSource,
      metadata.modelVersion ?? '',
      metadata.inputSnapshot.version,
      metadata.inputSnapshot.sha256,
      metadata.generatedAt,
    ]);
  };

  for (const team of teams) {
    for (const [group, count] of Object.entries(preDraw.groupProbabilities[team.id] ?? {})) {
      appendEstimate('pre-draw-group', team.id, group, count, preDraw.iterations, preDraw.metadata);
    }
    for (const [opponentId, count] of Object.entries(preDraw.opponentCounts[team.id] ?? {})) {
      appendEstimate('pre-draw-opponent', team.id, opponentId, count, preDraw.iterations, preDraw.metadata);
    }
    for (const [position, count] of Object.entries(tournament.groupFinish[team.id] ?? {})) {
      appendEstimate('official-group-finish', team.id, position, count, tournament.iterations, tournament.metadata);
    }
    for (const [round, count] of Object.entries(tournament.roundReach[team.id] ?? {})) {
      appendEstimate('official-round-reach', team.id, round, count, tournament.iterations, tournament.metadata);
    }
    for (const [round, opponents] of Object.entries(tournament.roundOpponents[team.id] ?? {})) {
      const effectiveTrials = tournament.roundReach[team.id]?.[round] ?? 0;
      for (const [opponentId, count] of Object.entries(opponents)) {
        appendEstimate('official-round-opponent-conditional', team.id, `${round}:${opponentId}`, count, effectiveTrials, tournament.metadata);
      }
    }
    for (const [matchId, opponents] of Object.entries(tournament.matchOpponents[team.id] ?? {})) {
      const effectiveTrials = Object.values(opponents).reduce((sum, count) => sum + count, 0);
      for (const [opponentId, count] of Object.entries(opponents)) {
        appendEstimate('official-match-opponent-conditional', team.id, `${matchId}:${opponentId}`, count, effectiveTrials, tournament.metadata);
      }
    }
  }

  return rows.map(row => row.map(escapeCsvCell).join(',')).join('\n');
}

export function downloadJson(filename: string, value: unknown) {
  downloadText(filename, `${JSON.stringify(value, null, 2)}\n`, 'application/json');
}

export function downloadCsv(filename: string, csv: string) {
  downloadText(filename, `${csv}\n`, 'text/csv;charset=utf-8');
}

function downloadText(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

type CsvValue = string | number | boolean;

function escapeCsvCell(value: CsvValue): string {
  const stringValue = String(value);
  return /[",\r\n]/.test(stringValue) ? `"${stringValue.replaceAll('"', '""')}"` : stringValue;
}
