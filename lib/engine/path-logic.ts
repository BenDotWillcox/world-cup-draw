import { THIRD_PLACE_SLOTS, KNOCKOUT_SCHEDULE } from '@/lib/data/knockout-schedule';
import { MATCH_SCHEDULE, type Match } from '@/lib/data/matches';
import { OFFICIAL_GROUPS } from '@/lib/data/official-draw';
import { TEAMS } from '@/lib/data/teams';
import { HOST_CITIES } from '@/lib/data/venues';
import { haversineDistance } from '@/lib/utils';
import precomputedStats from '@/lib/data/monte-carlo-results.json';

const ITERATIONS = 1000000;
const ALL_MATCHES: Match[] = [...MATCH_SCHEDULE, ...KNOCKOUT_SCHEDULE];

// Types for opponent resolution
export interface PotentialOpponent {
  teamId: string;
  teamName: string;
  flagUrl?: string;
  probability: number; // 0-100
  isScheduled: boolean;
}

export interface EnhancedMatchInfo {
  matchId: string;
  date: string;
  time: string;
  stadium: string;
  round: string;
  opponents: PotentialOpponent[];
  matchType: 'scheduled' | 'probabilistic';
}

export interface PathWeight {
    matchId: string;
    weight: number;
    description: string;
    label: string;
}

// --- New types for redesigned path visualizer ---

export interface BracketOpponent {
  teamId: string;
  teamName: string;
  flagUrl?: string;
  entryPath: string; // e.g., "1G", "3rd (Group E)"
  probability?: number; // 0-100, from tournament sim (conditional on reaching this round)
}

export interface BracketPathNode {
  matchId: string;
  round: string;
  venue: string;
  date: string;
  time: string;
  opponents: BracketOpponent[];
  teamPlaceholder: string; // which placeholder slot the team occupies
}

export interface TravelLeg {
  from: string;
  to: string;
  distanceKm: number;
  restDays: number;
  matchId: string;
  round: string;
}

export interface TravelStats {
  totalDistanceKm: number;
  cities: string[];
  uniqueCityCount: number;
  restDaysBetweenMatches: number[];
  averageRestDays: number;
  legs: TravelLeg[];
}

export interface CollapsedThirdPlace {
  possibleMatchIds: string[];
  possibleVenues: string[];
  centroidCoords: [number, number];
  allowedGroups: Record<string, string[]>; // matchId -> which groups
}

/**
 * Returns the group (e.g., "A") and position index (1-4) for a given team ID.
 * Returns null if team is not found in official groups.
 */
export const getTeamGroupAndPosition = (teamId: string): { group: string; position: number } | null => {
  for (const group of OFFICIAL_GROUPS) {
    const posIndex = group.teams.findIndex((t) => t?.id === teamId);
    if (posIndex !== -1) {
      return {
        group: group.name,
        position: posIndex + 1, // 1-based index (1, 2, 3, 4)
      };
    }
  }
  return null;
};

/**
 * Calculates weighted path entry points for a team in a specific group.
 * Logic:
 * - 33.3% chance of being 1st place (Winner)
 * - 33.3% chance of being 2nd place (Runner-up)
 * - 33.3% chance of being 3rd place (advancing)
 *   - The 3rd place probability is split evenly among all possible matches this group can feed into.
 */
export const getWeightedPathEntryPoints = (groupName: string): PathWeight[] => {
    const paths: PathWeight[] = [];
    const BASE_WEIGHT = 1 / 3; // 33.33%

    const findMatchIdForPlaceholder = (code: string): string => {
        const match = KNOCKOUT_SCHEDULE.find(m => m.placeholderT1 === code || m.placeholderT2 === code);
        return match ? match.id : 'unknown';
    };

    // 1. First Place Path
    paths.push({
        matchId: findMatchIdForPlaceholder(`1${groupName}`),
        weight: BASE_WEIGHT,
        description: `Winner Group ${groupName}`,
        label: `(1st Group Stage)`
    });

    // 2. Second Place Path
    paths.push({
        matchId: findMatchIdForPlaceholder(`2${groupName}`),
        weight: BASE_WEIGHT,
        description: `Runner-up Group ${groupName}`,
        label: `(2nd Group Stage)`
    });

    // 3. Third Place Path
    const possibleThirdPlaceMatches: string[] = [];
    for (const [matchId, allowedGroups] of Object.entries(THIRD_PLACE_SLOTS)) {
        if (allowedGroups.includes(groupName)) {
            possibleThirdPlaceMatches.push(matchId);
        }
    }

    if (possibleThirdPlaceMatches.length > 0) {
        const thirdPlaceWeight = BASE_WEIGHT / possibleThirdPlaceMatches.length;
        possibleThirdPlaceMatches.forEach(mid => {
            paths.push({
                matchId: mid,
                weight: thirdPlaceWeight,
                description: `3rd Place Group ${groupName}`,
                label: `(3rd Group Stage)`
            });
        });
    }

    return paths;
};

/**
 * Returns the sequence of 3 matches for a specific team position in a group.
 * e.g. Group A, Position 1 ('A1')
 */
export const getGroupMatchesForPosition = (group: string, position: number): string[] => {
    const code = `${group}${position}`;
    // Sort by date
    return MATCH_SCHEDULE
        .filter(m => m.t1 === code || m.t2 === code)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map(m => m.id);
};

/**
 * Returns BracketPathNode[] for a team's 3 group stage matches,
 * with the known opponent populated (no probability needed).
 */
export function getGroupStageNodes(group: string, position: number): BracketPathNode[] {
  const code = `${group}${position}`;
  const matches = MATCH_SCHEDULE
    .filter(m => m.t1 === code || m.t2 === code)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const groupObj = OFFICIAL_GROUPS.find(g => g.name === group);

  return matches.map((m, i) => {
    // The opponent code is the other side of the match
    const oppCode = m.t1 === code ? m.t2 : m.t1;
    // Parse group position from code like "A2" -> position 2
    const oppPos = parseInt(oppCode.slice(1), 10);
    const oppTeam = groupObj?.teams[oppPos - 1];

    const opponents: BracketOpponent[] = oppTeam
      ? [{
          teamId: oppTeam.id,
          teamName: oppTeam.name,
          flagUrl: oppTeam.flagUrl,
          entryPath: oppCode,
        }]
      : [];

    return {
      matchId: m.id,
      round: `Group Stage ${i + 1}`,
      venue: m.stadium,
      date: m.date,
      time: m.time,
      opponents,
      teamPlaceholder: code,
    };
  });
}

/**
 * Builds a map of Match ID -> Next Match ID (for Winner)
 */
export const getKnockoutFlow = (): Record<string, string> => {
    const flow: Record<string, string> = {};
    
    // Scan schedule for W{MatchID} placeholders
    KNOCKOUT_SCHEDULE.forEach(m => {
        if (m.placeholderT1?.startsWith('W')) {
            const prevId = 'M' + m.placeholderT1.substring(1);
            flow[prevId] = m.id;
        }
        if (m.placeholderT2?.startsWith('W')) {
            const prevId = 'M' + m.placeholderT2.substring(1);
            flow[prevId] = m.id;
        }
    });
    
    // Also handle Loser bracket for 3rd place?
    // User asked "path to the final", so likely Winner bracket.
    // But M101/M102 losers go to M103.
    // If we want complete path, we can add that.
    // For now, let's focus on Final.

    return flow;
};

/**
 * Gets the actual opponent for a group stage match.
 * @param matchId - Match ID (M1-M72)
 * @param selectedTeamGroupPos - Team's position code (e.g., "D1" for USA)
 * @returns Team info or null if not found
 */
export const getGroupStageOpponent = (
  matchId: string,
  selectedTeamGroupPos: string
): { teamId: string; teamName: string; flagUrl?: string } | null => {
  const match = MATCH_SCHEDULE.find(m => m.id === matchId);
  if (!match) return null;

  // Determine which position is opponent
  const opponentPos = match.t1 === selectedTeamGroupPos ? match.t2 : match.t1;

  // Resolve position code to actual team from OFFICIAL_GROUPS
  const groupName = opponentPos[0]; // e.g., "D"
  const posIndex = parseInt(opponentPos[1]) - 1; // 0-based

  const group = OFFICIAL_GROUPS.find(g => g.name === groupName);
  if (!group || !group.teams[posIndex]) return null;

  const team = group.teams[posIndex];
  return {
    teamId: team.id,
    teamName: team.name,
    flagUrl: team.flagUrl
  };
};

/**
 * Gets top N most likely opponents for a knockout match using Monte Carlo data.
 * @param teamId - Selected team ID
 * @param topN - Number of opponents to return (default 3)
 * @returns Array of potential opponents with probabilities, sorted by probability descending
 */
export const getKnockoutOpponentProbabilities = (
  teamId: string,
  topN: number = 3
): PotentialOpponent[] => {
  const stats = precomputedStats as { opponentCounts: Record<string, Record<string, number>> };
  const opponentCounts = stats.opponentCounts[teamId] || {};

  // Get all non-zero opponents
  const allOpponents = Object.entries(opponentCounts)
    .filter(([oppId, count]) => count > 0 && oppId !== teamId)
    .map(([oppId, count]) => {
      const team = TEAMS.find(t => t.id === oppId);
      return {
        teamId: oppId,
        teamName: team?.name || oppId,
        flagUrl: team?.flagUrl,
        probability: (count / ITERATIONS) * 100,
        isScheduled: false
      };
    })
    .sort((a, b) => b.probability - a.probability);

  return allOpponents.slice(0, topN);
};

/**
 * Determines the round name from a match ID.
 */
const getMatchRound = (matchId: string): string => {
  const matchNum = parseInt(matchId.slice(1));
  if (matchNum <= 72) return 'Group Stage';
  if (matchNum <= 88) return 'Round of 32';
  if (matchNum <= 96) return 'Round of 16';
  if (matchNum <= 100) return 'Quarterfinals';
  if (matchNum <= 102) return 'Semifinals';
  if (matchNum === 103) return 'Third Place';
  if (matchNum === 104) return 'Final';
  return 'Knockout';
};

/**
 * Resolves all potential opponents for a match (group or knockout).
 * @param matchId - Match ID
 * @param teamId - Selected team ID
 * @param groupPosCode - Team's group position code (e.g., "D1")
 * @returns EnhancedMatchInfo with opponents and match details
 */
export const resolveMatchOpponents = (
  matchId: string,
  teamId: string,
  groupPosCode: string
): EnhancedMatchInfo => {
  const allMatches = [...MATCH_SCHEDULE, ...KNOCKOUT_SCHEDULE];
  const match = allMatches.find(m => m.id === matchId);

  if (!match) {
    return {
      matchId,
      date: '',
      time: '',
      stadium: '',
      round: 'Unknown',
      opponents: [],
      matchType: 'probabilistic'
    };
  }

  const round = getMatchRound(matchId);
  const isGroupStage = parseInt(matchId.slice(1)) <= 72;

  if (isGroupStage) {
    const opponent = getGroupStageOpponent(matchId, groupPosCode);
    return {
      matchId,
      date: match.date,
      time: match.time,
      stadium: match.stadium,
      round,
      opponents: opponent
        ? [{
            ...opponent,
            probability: 100,
            isScheduled: true
          }]
        : [],
      matchType: 'scheduled'
    };
  } else {
    const opponents = getKnockoutOpponentProbabilities(teamId, 3);
    return {
      matchId,
      date: match.date,
      time: match.time,
      stadium: match.stadium,
      round,
      opponents,
      matchType: 'probabilistic'
    };
  }
};

// ============================================================
// NEW: Bracket-aware path resolution for redesigned visualizer
// ============================================================

const resolveCache = new Map<string, BracketOpponent[]>();

const FINISH_LABELS: Record<number, string> = {
  1: 'Winner',
  2: 'Runner-up',
  3: '3rd',
  4: '4th',
};

/**
 * Returns ALL teams in a group as potential finishers for the given position.
 * Any team in the group could theoretically finish 1st, 2nd, 3rd, or 4th.
 */
function getAllTeamsForGroupFinish(groupName: string, finishPosition: number): BracketOpponent[] {
  const group = OFFICIAL_GROUPS.find(g => g.name === groupName);
  if (!group) return [];
  return group.teams
    .filter((t): t is NonNullable<typeof t> => t !== null)
    .map(team => ({
      teamId: team.id,
      teamName: team.name,
      flagUrl: team.flagUrl,
      entryPath: `${FINISH_LABELS[finishPosition] || finishPosition} Group ${groupName}`,
    }));
}

export function resolveTeamsFromPlaceholder(placeholder: string): BracketOpponent[] {
  if (resolveCache.has(placeholder)) return resolveCache.get(placeholder)!;

  let result: BracketOpponent[] = [];

  // Direct group position: "1D", "2A", etc.
  // Return ALL teams in the group — any could finish in this position
  const directMatch = placeholder.match(/^([1-4])([A-L])$/);
  if (directMatch) {
    const pos = parseInt(directMatch[1]);
    const grp = directMatch[2];
    result = getAllTeamsForGroupFinish(grp, pos);
    resolveCache.set(placeholder, result);
    return result;
  }

  // Third-place slot: "3_M81"
  // Return ALL teams from each allowed group — any could finish 3rd
  if (placeholder.startsWith('3_')) {
    const matchId = placeholder.substring(2);
    const allowedGroups = THIRD_PLACE_SLOTS[matchId] || [];
    const seen = new Set<string>();
    result = allowedGroups
      .flatMap(g => getAllTeamsForGroupFinish(g, 3))
      .filter(t => {
        if (seen.has(t.teamId)) return false;
        seen.add(t.teamId);
        return true;
      });
    resolveCache.set(placeholder, result);
    return result;
  }

  // Winner or Loser of a match: "W73", "L101"
  const winLoseMatch = placeholder.match(/^([WL])(\d+)$/);
  if (winLoseMatch) {
    const matchId = 'M' + winLoseMatch[2];
    const match = KNOCKOUT_SCHEDULE.find(m => m.id === matchId);
    if (match) {
      const t1Teams = match.placeholderT1 ? resolveTeamsFromPlaceholder(match.placeholderT1) : [];
      const t2Teams = match.placeholderT2 ? resolveTeamsFromPlaceholder(match.placeholderT2) : [];
      // Deduplicate by teamId
      const seen = new Set<string>();
      result = [...t1Teams, ...t2Teams].filter(t => {
        if (seen.has(t.teamId)) return false;
        seen.add(t.teamId);
        return true;
      });
    }
    resolveCache.set(placeholder, result);
    return result;
  }

  resolveCache.set(placeholder, result);
  return result;
}

export function getPathConditionalOpponents(matchId: string, teamPlaceholder: string): BracketOpponent[] {
  const match = KNOCKOUT_SCHEDULE.find(m => m.id === matchId);
  if (!match) return [];

  // Determine which side is the team's side and which is the opponent's
  // We need to figure out if teamPlaceholder feeds into T1 or T2
  // For R32 this is straightforward; for later rounds we check if the team's
  // entry traces through placeholderT1 or placeholderT2
  const opponentPlaceholder = match.placeholderT1 === teamPlaceholder
    ? match.placeholderT2
    : match.placeholderT1;

  if (!opponentPlaceholder) return [];
  return resolveTeamsFromPlaceholder(opponentPlaceholder);
}

function findMatchById(id: string): Match | undefined {
  return ALL_MATCHES.find(m => m.id === id);
}

function resolveStadiumCoords(stadium: string): [number, number] | null {
  if (HOST_CITIES[stadium]) return HOST_CITIES[stadium];
  if (stadium === "New York/NJ") return HOST_CITIES["New York"];
  return null;
}

export function getFullBracketPath(
  groupName: string,
  position: 1 | 2 | 3,
  thirdPlaceMatchId?: string
): BracketPathNode[] {
  const path: BracketPathNode[] = [];
  const knockoutFlow = getKnockoutFlow();

  let currentMatchId: string | undefined;
  let teamPlaceholder: string;

  if (position === 1) {
    teamPlaceholder = `1${groupName}`;
    const match = KNOCKOUT_SCHEDULE.find(m => m.placeholderT1 === teamPlaceholder || m.placeholderT2 === teamPlaceholder);
    currentMatchId = match?.id;
  } else if (position === 2) {
    teamPlaceholder = `2${groupName}`;
    const match = KNOCKOUT_SCHEDULE.find(m => m.placeholderT1 === teamPlaceholder || m.placeholderT2 === teamPlaceholder);
    currentMatchId = match?.id;
  } else {
    // 3rd place — use specified entry match or first available
    if (thirdPlaceMatchId) {
      currentMatchId = thirdPlaceMatchId;
    } else {
      const firstSlot = Object.entries(THIRD_PLACE_SLOTS).find(([, groups]) => groups.includes(groupName));
      currentMatchId = firstSlot?.[0];
    }
    teamPlaceholder = `3_${currentMatchId}`;
  }

  if (!currentMatchId) return path;

  // Trace through bracket: R32 → R16 → QF → SF → Final
  let depth = 0;
  while (currentMatchId && depth < 6) {
    const match = findMatchById(currentMatchId);
    if (!match) break;

    const opponents = getPathConditionalOpponents(currentMatchId, teamPlaceholder);

    path.push({
      matchId: currentMatchId,
      round: getMatchRound(currentMatchId),
      venue: match.stadium,
      date: match.date,
      time: match.time,
      opponents,
      teamPlaceholder,
    });

    // Advance: team wins this match → W{matchNum}
    const matchNum = currentMatchId.slice(1); // e.g., "81"
    const nextMatchId: string | undefined = knockoutFlow[currentMatchId];
    if (!nextMatchId) break;

    // Figure out which placeholder the winner feeds into in the next match
    const nextMatch = KNOCKOUT_SCHEDULE.find(m => m.id === nextMatchId);
    if (nextMatch) {
      if (nextMatch.placeholderT1 === `W${matchNum}`) {
        teamPlaceholder = `W${matchNum}`;
      } else if (nextMatch.placeholderT2 === `W${matchNum}`) {
        teamPlaceholder = `W${matchNum}`;
      }
    }

    currentMatchId = nextMatchId;
    depth++;
  }

  return path;
}

export function computeTravelStats(matchIds: string[]): TravelStats {
  const cities: string[] = [];
  let totalDistance = 0;
  const restDays: number[] = [];
  const legs: TravelLeg[] = [];

  let prevCoords: [number, number] | null = null;
  let prevDate: Date | null = null;
  let prevCity: string | null = null;

  for (const matchId of matchIds) {
    const match = findMatchById(matchId);
    if (!match) continue;

    const coords = resolveStadiumCoords(match.stadium);
    cities.push(match.stadium);

    let legDistance = 0;
    if (coords && prevCoords) {
      legDistance = haversineDistance(prevCoords, coords);
      totalDistance += legDistance;
    }
    if (prevCoords) prevCoords = coords;
    else prevCoords = coords;

    const date = new Date(match.date);
    let legRestDays = 0;
    if (prevDate) {
      const diffMs = date.getTime() - prevDate.getTime();
      legRestDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      restDays.push(legRestDays);
    }

    if (prevCity) {
      legs.push({
        from: prevCity,
        to: match.stadium,
        distanceKm: Math.round(legDistance),
        restDays: legRestDays,
        matchId,
        round: matchId,
      });
    }

    prevDate = date;
    prevCity = match.stadium;
  }

  const unique = [...new Set(cities)];
  return {
    totalDistanceKm: Math.round(totalDistance),
    cities,
    uniqueCityCount: unique.length,
    restDaysBetweenMatches: restDays,
    averageRestDays: restDays.length > 0 ? Math.round((restDays.reduce((a, b) => a + b, 0) / restDays.length) * 10) / 10 : 0,
    legs,
  };
}

export function getThirdPlaceCollapsedInfo(groupName: string): CollapsedThirdPlace {
  const possibleMatchIds: string[] = [];
  const possibleVenues: string[] = [];
  const allowedGroups: Record<string, string[]> = {};

  for (const [matchId, groups] of Object.entries(THIRD_PLACE_SLOTS)) {
    if (groups.includes(groupName)) {
      possibleMatchIds.push(matchId);
      const match = findMatchById(matchId);
      if (match) possibleVenues.push(match.stadium);
      allowedGroups[matchId] = groups;
    }
  }

  // Compute centroid of possible venues
  let sumLon = 0, sumLat = 0, count = 0;
  for (const venue of possibleVenues) {
    const coords = resolveStadiumCoords(venue);
    if (coords) {
      sumLon += coords[0];
      sumLat += coords[1];
      count++;
    }
  }

  const centroidCoords: [number, number] = count > 0
    ? [sumLon / count, sumLat / count]
    : [-98, 38]; // fallback center of US

  return { possibleMatchIds, possibleVenues, centroidCoords, allowedGroups };
}

export function getMatchVenueCoords(matchId: string): [number, number] | null {
  const match = findMatchById(matchId);
  if (!match) return null;
  return resolveStadiumCoords(match.stadium);
}

// ============================================================
// Tournament sim probability enrichment
// ============================================================

import tournamentSimData from '@/lib/data/tournament-sim-results.json';

const simData = tournamentSimData as {
  groupFinish: Record<string, Record<number, number>>;
  roundReach: Record<string, Record<string, number>>;
  roundOpponents: Record<string, Record<string, Record<string, number>>>;
  matchOpponents: Record<string, Record<string, Record<string, number>>>;
  iterations: number;
};

/**
 * Enriches a bracket path's opponents with probability data from the tournament simulation.
 *
 * Uses per-match opponent counts so probabilities are accurate for each specific
 * bracket match (e.g., M81 only counts times the team actually played in M81,
 * not other R32 matches).
 *
 * Opponents are sorted by probability descending and those with <0.1% are removed.
 */
export function enrichPathWithProbabilities(
  teamId: string,
  path: BracketPathNode[],
): BracketPathNode[] {
  const teamMatchOpponents = simData.matchOpponents[teamId];
  if (!teamMatchOpponents) return path;

  return path.map(node => {
    const matchOpps = teamMatchOpponents[node.matchId] || {};

    // Total times the team appeared in this specific match
    let totalMatchCount = 0;
    for (const count of Object.values(matchOpps)) {
      totalMatchCount += count as number;
    }

    if (totalMatchCount === 0) return node;

    // Enrich each opponent with normalized probability
    const enriched = node.opponents
      .map(opp => {
        const count = (matchOpps[opp.teamId] || 0) as number;
        return {
          ...opp,
          probability: (count / totalMatchCount) * 100,
        };
      })
      .filter(opp => opp.probability > 0.1) // Remove near-zero
      .sort((a, b) => (b.probability ?? 0) - (a.probability ?? 0));

    return { ...node, opponents: enriched };
  });
}

