import type { Group, Team } from '@/types/draw';

export interface DrawStatusInput {
  isOfficialDraw: boolean;
  isComplete: boolean;
  isRunning: boolean;
  currentPot: number;
}

export function isDrawComplete(groups: Group[]): boolean {
  return groups.length === 12 && groups.every(
    group => group.teams.length === 4 && group.teams.every(team => team !== null),
  );
}

export function getDrawStatusText({
  isOfficialDraw,
  isComplete,
  isRunning,
  currentPot,
}: DrawStatusInput): string {
  if (isOfficialDraw) return 'Official Draw';
  if (isComplete) return 'Draw Complete';
  if (isRunning) return `Drawing Pot ${currentPot}`;
  return 'Ready to Start';
}

export function getDrawCenterPrompt(draggingTeam: Team | null, isComplete: boolean): string {
  if (draggingTeam) return 'Drop to Place';
  if (isComplete) return 'All 48 teams placed';
  return 'Waiting for Draw';
}

export function getReturnToPotLabel(team: Team, groupName: string, fallbackPot: number): string {
  return `Return ${team.name} from Group ${groupName} to Pot ${team.pot ?? fallbackPot}`;
}
