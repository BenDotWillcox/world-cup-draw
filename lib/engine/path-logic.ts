import { THIRD_PLACE_SLOTS, KNOCKOUT_SCHEDULE } from '@/lib/data/knockout-schedule';
import { MATCH_SCHEDULE } from '@/lib/data/matches';
import { OFFICIAL_GROUPS } from '@/lib/data/official-draw';

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

