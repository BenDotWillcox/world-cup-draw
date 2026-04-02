import { ELO_RATINGS, HOST_TEAM_IDS, HOST_ELO_BONUS } from '@/lib/data/elo-ratings';

/**
 * Elo-based match outcome probabilities for FIFA World Cup simulation.
 *
 * Uses the standard Elo expected score formula with a draw margin.
 * Draw margin of 60 Elo points reflects typical international football
 * draw rates (~25% for evenly matched teams).
 */

const DRAW_MARGIN = 60;

/**
 * Get the effective Elo rating for a team, applying home bonus if applicable.
 */
export function getEffectiveElo(teamId: string, isHome: boolean = false): number {
  const base = ELO_RATINGS[teamId] ?? 1500;
  return isHome && HOST_TEAM_IDS.has(teamId) ? base + HOST_ELO_BONUS : base;
}

/**
 * Calculate match outcome probabilities between two teams.
 *
 * Returns [pWinA, pDraw, pWinB] that sum to 1.
 *
 * The draw probability is derived by treating a draw as neither team
 * winning by more than the draw margin. This is the Davidson/Elo
 * approach commonly used in football:
 *   - P(A wins) = 1 / (1 + 10^((ratingB - ratingA + DRAW_MARGIN) / 400))
 *   - P(B wins) = 1 / (1 + 10^((ratingA - ratingB + DRAW_MARGIN) / 400))
 *   - P(Draw)   = 1 - P(A wins) - P(B wins)
 */
export function matchProbabilities(
  teamAId: string,
  teamBId: string,
  teamAHome: boolean = false,
  teamBHome: boolean = false,
): [pWinA: number, pDraw: number, pWinB: number] {
  const rA = getEffectiveElo(teamAId, teamAHome);
  const rB = getEffectiveElo(teamBId, teamBHome);

  const pWinA = 1 / (1 + Math.pow(10, (rB - rA + DRAW_MARGIN) / 400));
  const pWinB = 1 / (1 + Math.pow(10, (rA - rB + DRAW_MARGIN) / 400));
  const pDraw = 1 - pWinA - pWinB;

  return [pWinA, pDraw, pWinB];
}

/**
 * Simulate a single match outcome using Elo probabilities.
 *
 * Returns 'A' | 'D' | 'B' for team A win, draw, or team B win.
 * For knockout matches, use simulateKnockoutMatch instead.
 */
export function simulateGroupMatch(
  teamAId: string,
  teamBId: string,
  teamAHome: boolean = false,
  teamBHome: boolean = false,
): 'A' | 'D' | 'B' {
  const [pWinA, pDraw] = matchProbabilities(teamAId, teamBId, teamAHome, teamBHome);
  const r = Math.random();

  if (r < pWinA) return 'A';
  if (r < pWinA + pDraw) return 'D';
  return 'B';
}

/**
 * Simulate a knockout match (no draws — must produce a winner).
 *
 * Uses the standard Elo win probability without a draw margin.
 * This abstracts over extra time and penalties.
 */
export function simulateKnockoutMatch(
  teamAId: string,
  teamBId: string,
  teamAHome: boolean = false,
  teamBHome: boolean = false,
): 'A' | 'B' {
  const rA = getEffectiveElo(teamAId, teamAHome);
  const rB = getEffectiveElo(teamBId, teamBHome);

  const pWinA = 1 / (1 + Math.pow(10, (rB - rA) / 400));
  return Math.random() < pWinA ? 'A' : 'B';
}
