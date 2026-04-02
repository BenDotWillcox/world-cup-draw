import { OFFICIAL_GROUPS } from '@/lib/data/official-draw';
import { KNOCKOUT_SCHEDULE, THIRD_PLACE_SLOTS } from '@/lib/data/knockout-schedule';
import { ELO_RATINGS, HOST_TEAM_IDS, HOST_ELO_BONUS } from '@/lib/data/elo-ratings';

/**
 * Full tournament Monte Carlo simulation using Elo ratings.
 *
 * Simulates group stages → 3rd place allocation → knockout bracket.
 * Tracks group finish positions, round-by-round opponents, and deep run probabilities.
 */

// ---- Constants ----

const ROUNDS = ['R32', 'R16', 'QF', 'SF', 'F'] as const;
type Round = typeof ROUNDS[number];

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

// Pre-parse knockout bracket structure
interface R32Match {
  id: string;
  placeholderT1: string;
  placeholderT2: string;
}

// Build bracket flow: matchId → { nextMatchId, side ('T1' | 'T2') }
interface BracketNext {
  matchId: string;
  side: 'T1' | 'T2';
}

const BRACKET_FLOW: Record<string, BracketNext> = {};
for (const m of KNOCKOUT_SCHEDULE) {
  if (m.placeholderT1?.startsWith('W')) {
    const prevId = 'M' + m.placeholderT1.substring(1);
    BRACKET_FLOW[prevId] = { matchId: m.id, side: 'T1' };
  }
  if (m.placeholderT2?.startsWith('W')) {
    const prevId = 'M' + m.placeholderT2.substring(1);
    BRACKET_FLOW[prevId] = { matchId: m.id, side: 'T2' };
  }
}

// R32 matches grouped by placeholder type
const R32_MATCHES: R32Match[] = KNOCKOUT_SCHEDULE
  .filter(m => {
    const num = parseInt(m.id.slice(1));
    return num >= 73 && num <= 88;
  })
  .map(m => ({
    id: m.id,
    placeholderT1: m.placeholderT1 || '',
    placeholderT2: m.placeholderT2 || '',
  }));

// Third place slot info
const THIRD_PLACE_MATCH_IDS = Object.keys(THIRD_PLACE_SLOTS);
const THIRD_PLACE_ALLOWED: Record<string, Set<string>> = {};
for (const [matchId, groups] of Object.entries(THIRD_PLACE_SLOTS)) {
  THIRD_PLACE_ALLOWED[matchId] = new Set(groups);
}

// ---- Simulation helpers ----

/** Simulate a group stage match. Returns points for [teamA, teamB]. */
function simulateGroupMatchPoints(eloA: number, eloB: number): [number, number] {
  const pWinA = 1 / (1 + Math.pow(10, (eloB - eloA + DRAW_MARGIN) / 400));
  const pWinB = 1 / (1 + Math.pow(10, (eloA - eloB + DRAW_MARGIN) / 400));

  const r = Math.random();
  if (r < pWinA) return [3, 0];
  if (r < pWinA + (1 - pWinA - pWinB)) return [1, 1];
  return [0, 3];
}

/** Simulate a knockout match. Returns winner's teamId. */
function simulateKnockout(eloA: number, eloB: number): 0 | 1 {
  const pWinA = 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
  return Math.random() < pWinA ? 0 : 1;
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

function simulateGroupStage(group: GroupInfo): GroupStandings {
  const ids = group.teamIds;
  const points = [0, 0, 0, 0];

  // Round-robin: 6 matches (indices: 0v1, 0v2, 0v3, 1v2, 1v3, 2v3)
  const matchups: [number, number][] = [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]];

  for (const [a, b] of matchups) {
    const [ptsA, ptsB] = simulateGroupMatchPoints(
      GROUP_ELOS[ids[a]] ?? 1500,
      GROUP_ELOS[ids[b]] ?? 1500,
    );
    points[a] += ptsA;
    points[b] += ptsB;
  }

  // Sort by points descending, then random tiebreak
  const indices = [0, 1, 2, 3];
  indices.sort((a, b) => {
    if (points[b] !== points[a]) return points[b] - points[a];
    return Math.random() - 0.5; // random tiebreak
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
 * Determine which 8 of 12 third-place teams advance and assign to R32 slots.
 * Returns a map: matchId → teamId for each third-place slot.
 */
function allocateThirdPlace(
  allThirdPlace: ThirdPlaceTeam[]
): Record<string, string> | null {
  // Sort descending by points, random tiebreak
  allThirdPlace.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return Math.random() - 0.5;
  });

  // Top 8 advance
  const advancing = allThirdPlace.slice(0, 8);
  const advancingGroups = new Set(advancing.map(t => t.group));

  // Assign to slots using greedy random with backtracking
  const assignment: Record<string, string> = {};
  const assigned = new Set<string>(); // groups already assigned

  // Shuffle slot order for randomness
  const slots = [...THIRD_PLACE_MATCH_IDS];
  for (let i = slots.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }

  // Try to assign using recursive backtracking
  function backtrack(slotIdx: number): boolean {
    if (slotIdx >= slots.length) return assigned.size === 8;

    const matchId = slots[slotIdx];
    const allowed = THIRD_PLACE_ALLOWED[matchId];

    // Get candidates: advancing teams whose group is allowed and not yet assigned
    const candidates = advancing.filter(
      t => allowed.has(t.group) && !assigned.has(t.group)
    );

    // Shuffle candidates for randomness
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    for (const candidate of candidates) {
      assignment[matchId] = candidate.teamId;
      assigned.add(candidate.group);

      if (backtrack(slotIdx + 1)) return true;

      delete assignment[matchId];
      assigned.delete(candidate.group);
    }

    // This slot gets no one (only 8 teams for 8 slots, but constraint mismatch)
    // Try skipping — shouldn't happen with correct FIFA constraints, but safety
    return backtrack(slotIdx + 1);
  }

  if (backtrack(0)) return assignment;
  return null; // failed — discard this iteration
}

// ---- Knockout bracket simulation ----

/**
 * Simulate the full knockout bracket.
 * Returns the teamId occupying each match slot after simulation.
 */
function simulateKnockoutBracket(
  groupResults: GroupStandings[],
  thirdPlaceAssignment: Record<string, string>,
): Record<string, string> {
  // matchId → winning teamId
  const matchWinners: Record<string, string> = {};
  // matchId → [teamIdT1, teamIdT2] (the two teams in the match)
  const matchTeams: Record<string, [string, string]> = {};

  // Resolve a placeholder to a teamId
  function resolve(placeholder: string): string {
    // Direct group position: "1D", "2A"
    const directMatch = placeholder.match(/^([12])([A-L])$/);
    if (directMatch) {
      const pos = parseInt(directMatch[1]) - 1; // 0-based
      const grp = directMatch[2];
      const standings = groupResults.find(g => g.group === grp)!;
      return standings.positions[pos];
    }

    // Third place: "3_M81"
    if (placeholder.startsWith('3_')) {
      const matchId = placeholder.substring(2);
      return thirdPlaceAssignment[matchId] || 'UNKNOWN';
    }

    // Winner: "W73"
    if (placeholder.startsWith('W')) {
      const matchId = 'M' + placeholder.substring(1);
      return matchWinners[matchId] || 'UNKNOWN';
    }

    // Loser: "L101" (for 3rd place match)
    if (placeholder.startsWith('L')) {
      const matchId = 'M' + placeholder.substring(1);
      const teams = matchTeams[matchId];
      const winner = matchWinners[matchId];
      if (teams && winner) {
        return teams[0] === winner ? teams[1] : teams[0];
      }
      return 'UNKNOWN';
    }

    return 'UNKNOWN';
  }

  // Process matches in order (they're already sorted by round in KNOCKOUT_SCHEDULE)
  for (const match of KNOCKOUT_SCHEDULE) {
    const t1 = resolve(match.placeholderT1 || '');
    const t2 = resolve(match.placeholderT2 || '');

    matchTeams[match.id] = [t1, t2];

    const elo1 = KNOCKOUT_ELOS[t1] ?? 1500;
    const elo2 = KNOCKOUT_ELOS[t2] ?? 1500;
    const winnerIdx = simulateKnockout(elo1, elo2);
    matchWinners[match.id] = winnerIdx === 0 ? t1 : t2;
  }

  return matchWinners;
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

export function runTournamentSimulation(iterations: number): TournamentSimResult {
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

  while (successCount < iterations) {
    // 1. Simulate all 12 groups
    const groupResults = GROUPS.map(simulateGroupStage);

    // 2. Collect third-place teams
    const thirdPlaceTeams: ThirdPlaceTeam[] = groupResults.map(g => ({
      teamId: g.positions[2],
      group: g.group,
      points: g.thirdPlacePoints,
    }));

    // 3. Allocate third-place teams to knockout slots
    const thirdPlaceAssignment = allocateThirdPlace(thirdPlaceTeams);
    if (!thirdPlaceAssignment) continue; // rare constraint failure, retry

    // 4. Record group finish positions
    for (const g of groupResults) {
      for (let pos = 0; pos < 4; pos++) {
        groupFinish[g.positions[pos]][pos + 1]++;
      }
    }

    // 5. Determine which teams advance to R32
    const advancingTeams = new Set<string>();
    for (const g of groupResults) {
      advancingTeams.add(g.positions[0]); // 1st
      advancingTeams.add(g.positions[1]); // 2nd
    }
    for (const teamId of Object.values(thirdPlaceAssignment)) {
      advancingTeams.add(teamId); // advancing 3rd place
    }

    // 6. Simulate knockout bracket
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
        return thirdPlaceAssignment![matchId] || 'UNKNOWN';
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
      const winnerIdx = simulateKnockout(elo1, elo2);
      matchWinners[match.id] = winnerIdx === 0 ? t1 : t2;
    }

    // 7. Record knockout stats
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
  };
}
