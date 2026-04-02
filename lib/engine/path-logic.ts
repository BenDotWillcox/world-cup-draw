import { THIRD_PLACE_SLOTS, KNOCKOUT_SCHEDULE } from '@/lib/data/knockout-schedule';
import { MATCH_SCHEDULE } from '@/lib/data/matches';
import { OFFICIAL_GROUPS } from '@/lib/data/official-draw';
import { TEAMS } from '@/lib/data/teams';
import precomputedStats from '@/lib/data/monte-carlo-results.json';

const ITERATIONS = 1000000;

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
    weight: number; // 0-1 (e.g., 0.33 for 33%)
    description: string; // e.g., "Winner Group A" or "3rd Place"
    label: string; // Viz label e.g. "(1st Group Stage)"
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
    // Knockout round - get top 3 likely opponents
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

