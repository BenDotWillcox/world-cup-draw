import { OFFICIAL_GROUPS } from '@/lib/data/official-draw';
import { KNOCKOUT_SCHEDULE } from '@/lib/data/knockout-schedule';
import { ELO_RATINGS, HOST_TEAM_IDS, HOST_ELO_BONUS } from '@/lib/data/elo-ratings';
import { getAnnexeCThirdPlaceGroups } from '@/lib/data/third-place-combinations';
import type { RandomSource } from '@/lib/engine/random';

/**
 * Full tournament Monte Carlo simulation using Elo ratings.
 *
 * Simulates group stages → 3rd place allocation → knockout bracket.
 * Tracks group finish positions, round-by-round opponents, and deep run probabilities.
 */

// ---- Constants ----

type Round = 'R32' | 'R16' | 'QF' | 'SF' | 'F';

const DRAW_MARGIN = 60;

// Pre-extract group data as plain arrays for speed
interface GroupInfo {
  name: string;
  teamIds: string[];
}

const GROUPS: GroupInfo[] = OFFICIAL_GROUPS.map(g => ({
  name: g.name,
  teamIds: g.teams.map(t => t!.id),
}));

// Pre-compute Elo ratings with host bonus for group stage (hosts always play at home)
const GROUP_ELOS: Record<string, number> = {};
for (const [id, rating] of Object.entries(ELO_RATINGS)) {
  GROUP_ELOS[id] = HOST_TEAM_IDS.has(id) ? rating + HOST_ELO_BONUS : rating;
}

// Knockout Elos: hosts get bonus (simplification — most venues are in host countries)
const KNOCKOUT_ELOS = GROUP_ELOS; // same bonus logic

// ---- Simulation helpers ----

/** Simulate a group stage match. Returns points for [teamA, teamB]. */
function simulateGroupMatchPoints(
  eloA: number,
  eloB: number,
  random: RandomSource,
): [number, number] {
  const pWinA = 1 / (1 + Math.pow(10, (eloB - eloA + DRAW_MARGIN) / 400));
  const pWinB = 1 / (1 + Math.pow(10, (eloA - eloB + DRAW_MARGIN) / 400));

  const r = random();
  if (r < pWinA) return [3, 0];
  if (r < pWinA + (1 - pWinA - pWinB)) return [1, 1];
  return [0, 3];
}

/** Simulate a knockout match. Returns winner's teamId. */
function simulateKnockout(eloA: number, eloB: number, random: RandomSource): 0 | 1 {
  const pWinA = 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
  return random() < pWinA ? 0 : 1;
}

// ---- Group stage simulation ----

interface GroupStandings {
  /** teamIds sorted by position: [0]=1st, [1]=2nd, [2]=3rd, [3]=4th */
  positions: string[];
  /** Points for the 3rd place team (for ranking 3rd-place teams across groups) */
  thirdPlacePoints: number;
  /** Group name */
  group: string;
}

function simulateGroupStage(group: GroupInfo, random: RandomSource): GroupStandings {
  const ids = group.teamIds;
  const points = [0, 0, 0, 0];

  // Round-robin: 6 matches (indices: 0v1, 0v2, 0v3, 1v2, 1v3, 2v3)
  const matchups: [number, number][] = [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]];

  for (const [a, b] of matchups) {
    const [ptsA, ptsB] = simulateGroupMatchPoints(
      GROUP_ELOS[ids[a]] ?? 1500,
      GROUP_ELOS[ids[b]] ?? 1500,
      random,
    );
    points[a] += ptsA;
    points[b] += ptsB;
  }

  // Pre-compute random tie keys so the comparator remains transitive and
  // deterministic for a given random stream.
  const indices = [0, 1, 2, 3];
  const tieKeys = indices.map(() => random());
  indices.sort((a, b) => {
    if (points[b] !== points[a]) return points[b] - points[a];
    if (tieKeys[a] !== tieKeys[b]) return tieKeys[a] - tieKeys[b];
    return a - b;
  });

  return {
    positions: indices.map(i => ids[i]),
    thirdPlacePoints: points[indices[2]],
    group: group.name,
  };
}

// ---- Third-place allocation ----

interface ThirdPlaceTeam {
  teamId: string;
  group: string;
  points: number;
}

/**
 * Determine which 8 of 12 third-place teams advance, then apply the exact
 * FIFA Annexe C assignment for that combination of qualifying groups.
 */
function allocateThirdPlace(
  allThirdPlace: ThirdPlaceTeam[],
  random: RandomSource,
): Record<string, string> {
  // Generate tie keys before sorting so comparisons are stable/transitive.
  const tieKeys = new Map(allThirdPlace.map(team => [team.group, random()]));
  allThirdPlace.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const tieDifference = tieKeys.get(a.group)! - tieKeys.get(b.group)!;
    if (tieDifference !== 0) return tieDifference;
    return a.group < b.group ? -1 : a.group > b.group ? 1 : 0;
  });

  // Top 8 advance
  const advancing = allThirdPlace.slice(0, 8);
  const teamByGroup = new Map(advancing.map(team => [team.group, team.teamId]));
  const groupByMatch = getAnnexeCThirdPlaceGroups(advancing.map(team => team.group));

  return Object.fromEntries(
    Object.entries(groupByMatch).map(([matchId, group]) => {
      const teamId = teamByGroup.get(group);
      if (!teamId) throw new Error(`Annexe C assigned non-qualifying Group ${group} to ${matchId}.`);
      return [matchId, teamId];
    }),
  );
}

// ---- Result types ----

export interface TournamentSimResult {
  /** teamId → { 1: count, 2: count, 3: count, 4: count } */
  groupFinish: Record<string, Record<number, number>>;
  /** teamId → { R32: count, R16: count, QF: count, SF: count, F: count, W: count } */
  roundReach: Record<string, Record<string, number>>;
  /** teamId → { R32: { oppId: count }, R16: { oppId: count }, ... } */
  roundOpponents: Record<string, Record<string, Record<string, number>>>;
  /** teamId → { matchId: { oppId: count } } — per-match opponent tracking */
  matchOpponents: Record<string, Record<string, Record<string, number>>>;
  /** Number of successful iterations */
  iterations: number;
  /** Total simulation attempts, including discarded iterations */
  attempts: number;
  /** Attempts discarded before producing a complete tournament result */
  rejectedIterations: number;
}

// Match ID ranges for each round
function getRound(matchId: string): Round | null {
  const num = parseInt(matchId.slice(1));
  if (num >= 73 && num <= 88) return 'R32';
  if (num >= 89 && num <= 96) return 'R16';
  if (num >= 97 && num <= 100) return 'QF';
  if (num >= 101 && num <= 102) return 'SF';
  if (num === 104) return 'F';
  return null; // 103 = 3rd place, skip
}

// ---- Main simulation ----

export function runTournamentSimulation(
  iterations: number,
  random: RandomSource = Math.random,
): TournamentSimResult {
  // All team IDs
  const allTeamIds = GROUPS.flatMap(g => g.teamIds);

  // Initialize result accumulators
  const groupFinish: Record<string, Record<number, number>> = {};
  const roundReach: Record<string, Record<string, number>> = {};
  const roundOpponents: Record<string, Record<string, Record<string, number>>> = {};
  const matchOpponents: Record<string, Record<string, Record<string, number>>> = {};

  for (const id of allTeamIds) {
    groupFinish[id] = { 1: 0, 2: 0, 3: 0, 4: 0 };
    roundReach[id] = { R32: 0, R16: 0, QF: 0, SF: 0, F: 0, W: 0 };
    roundOpponents[id] = { R32: {}, R16: {}, QF: {}, SF: {}, F: {} };
    matchOpponents[id] = {};
  }

  let successCount = 0;
  let attempts = 0;
  const rejectedIterations = 0;

  while (successCount < iterations) {
    attempts++;
    // 1. Simulate all 12 groups
    const groupResults = GROUPS.map(group => simulateGroupStage(group, random));

    // 2. Collect third-place teams
    const thirdPlaceTeams: ThirdPlaceTeam[] = groupResults.map(g => ({
      teamId: g.positions[2],
      group: g.group,
      points: g.thirdPlacePoints,
    }));

    // 3. Allocate third-place teams to knockout slots
    const thirdPlaceAssignment = allocateThirdPlace(thirdPlaceTeams, random);

    // 4. Record group finish positions
    for (const g of groupResults) {
      for (let pos = 0; pos < 4; pos++) {
        groupFinish[g.positions[pos]][pos + 1]++;
      }
    }

    // 5. Simulate knockout bracket
    // We need to track match teams, not just winners
    // Re-implement inline to capture per-match participants
    const matchWinners: Record<string, string> = {};
    const matchTeams: Record<string, [string, string]> = {};

    function resolve(placeholder: string): string {
      const directMatch = placeholder.match(/^([12])([A-L])$/);
      if (directMatch) {
        const pos = parseInt(directMatch[1]) - 1;
        const grp = directMatch[2];
        const standings = groupResults.find(g => g.group === grp)!;
        return standings.positions[pos];
      }
      if (placeholder.startsWith('3_')) {
        const matchId = placeholder.substring(2);
        return thirdPlaceAssignment[matchId] || 'UNKNOWN';
      }
      if (placeholder.startsWith('W')) {
        const matchId = 'M' + placeholder.substring(1);
        return matchWinners[matchId] || 'UNKNOWN';
      }
      if (placeholder.startsWith('L')) {
        const matchId = 'M' + placeholder.substring(1);
        const teams = matchTeams[matchId];
        const winner = matchWinners[matchId];
        if (teams && winner) return teams[0] === winner ? teams[1] : teams[0];
        return 'UNKNOWN';
      }
      return 'UNKNOWN';
    }

    for (const match of KNOCKOUT_SCHEDULE) {
      const t1 = resolve(match.placeholderT1 || '');
      const t2 = resolve(match.placeholderT2 || '');
      matchTeams[match.id] = [t1, t2];

      const elo1 = KNOCKOUT_ELOS[t1] ?? 1500;
      const elo2 = KNOCKOUT_ELOS[t2] ?? 1500;
      const winnerIdx = simulateKnockout(elo1, elo2, random);
      matchWinners[match.id] = winnerIdx === 0 ? t1 : t2;
    }

    // 6. Record knockout stats
    for (const match of KNOCKOUT_SCHEDULE) {
      const round = getRound(match.id);
      if (!round) continue; // skip 3rd place match

      const [t1, t2] = matchTeams[match.id];
      if (t1 === 'UNKNOWN' || t2 === 'UNKNOWN') continue;

      // Both teams reached this round
      if (roundReach[t1]) roundReach[t1][round]++;
      if (roundReach[t2]) roundReach[t2][round]++;

      // Record opponents by round
      if (roundOpponents[t1]?.[round]) {
        roundOpponents[t1][round][t2] = (roundOpponents[t1][round][t2] || 0) + 1;
      }
      if (roundOpponents[t2]?.[round]) {
        roundOpponents[t2][round][t1] = (roundOpponents[t2][round][t1] || 0) + 1;
      }

      // Record opponents by match ID
      const mid = match.id;
      if (matchOpponents[t1]) {
        if (!matchOpponents[t1][mid]) matchOpponents[t1][mid] = {};
        matchOpponents[t1][mid][t2] = (matchOpponents[t1][mid][t2] || 0) + 1;
      }
      if (matchOpponents[t2]) {
        if (!matchOpponents[t2][mid]) matchOpponents[t2][mid] = {};
        matchOpponents[t2][mid][t1] = (matchOpponents[t2][mid][t1] || 0) + 1;
      }
    }

    // Record tournament winner
    const winner = matchWinners['M104'];
    if (winner && roundReach[winner]) {
      roundReach[winner]['W']++;
    }

    successCount++;
  }

  return {
    groupFinish,
    roundReach,
    roundOpponents,
    matchOpponents,
    iterations: successCount,
    attempts,
    rejectedIterations,
  };
}
