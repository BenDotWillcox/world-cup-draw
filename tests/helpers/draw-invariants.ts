import assert from 'node:assert/strict';

import { TEAMS } from '@/lib/data/teams';
import {
  APPENDIX_B_POSITIONS,
  getPossibleConfederations,
  GROUP_NAMES,
  type Group,
  type Team,
} from '@/types/draw';

const LEFT_SIDE = new Set(['D', 'E', 'F', 'G', 'H', 'I']);
const HOST_GROUPS: Record<string, string> = {
  MEX: 'A',
  CAN: 'B',
  USA: 'D',
};

const expectedPotAtPosition = (groupIndex: number, positionIndex: number): number => {
  if (positionIndex === 0) return 1;

  for (const pot of [2, 3, 4] as const) {
    if (APPENDIX_B_POSITIONS[pot][groupIndex] - 1 === positionIndex) return pot;
  }

  throw new Error(`No pot maps to group ${GROUP_NAMES[groupIndex]} position ${positionIndex + 1}`);
};

const groupForTeam = (groups: Group[], teamId: string): string => {
  const group = groups.find(candidate => candidate.teams.some(team => team?.id === teamId));
  assert.ok(group, `${teamId} must be assigned to a group`);
  return group.name;
};

export const assertDrawInvariants = (groups: Group[], expectedTeams: Team[] = TEAMS): void => {
  assert.equal(groups.length, GROUP_NAMES.length, 'a draw must contain 12 groups');
  assert.deepEqual(groups.map(group => group.name), GROUP_NAMES, 'groups must be ordered A-L');

  const assignedIds: string[] = [];

  groups.forEach((group, groupIndex) => {
    assert.equal(group.teams.length, 4, `group ${group.name} must expose four positions`);

    group.teams.forEach((team, positionIndex) => {
      assert.ok(team, `group ${group.name} position ${positionIndex + 1} must be filled`);
      assignedIds.push(team.id);
      assert.equal(
        team.pot,
        expectedPotAtPosition(groupIndex, positionIndex),
        `${team.id} is in the wrong pot position for group ${group.name}`,
      );
    });

    const possibleSets = group.teams.map(team => getPossibleConfederations(team!));
    const possibleUefaCount = possibleSets.filter(confeds => confeds.includes('UEFA')).length;
    const guaranteedUefaCount = possibleSets.filter(
      confeds => confeds.length > 0 && confeds.every(confed => confed === 'UEFA'),
    ).length;

    assert.ok(guaranteedUefaCount >= 1, `group ${group.name} must contain at least one UEFA team`);
    assert.ok(possibleUefaCount <= 2, `group ${group.name} must contain at most two possible UEFA teams`);

    for (const confed of ['AFC', 'CAF', 'CONCACAF', 'CONMEBOL', 'OFC'] as const) {
      const possibleCount = possibleSets.filter(confeds => confeds.includes(confed)).length;
      assert.ok(
        possibleCount <= 1,
        `group ${group.name} cannot contain multiple teams that could represent ${confed} (${group.teams.map(team => team?.id).join(', ')})`,
      );
    }
  });

  const expectedIds = expectedTeams.map(team => team.id).sort();
  assert.equal(new Set(assignedIds).size, expectedIds.length, 'every assigned team must be unique');
  assert.deepEqual(assignedIds.sort(), expectedIds, 'every input team must appear exactly once');

  for (const [hostId, expectedGroup] of Object.entries(HOST_GROUPS)) {
    assert.equal(groupForTeam(groups, hostId), expectedGroup, `${hostId} must be placed in group ${expectedGroup}`);
  }

  for (const [first, second] of [['ESP', 'ARG'], ['FRA', 'ENG']] as const) {
    const firstGroup = groupForTeam(groups, first);
    const secondGroup = groupForTeam(groups, second);
    assert.notEqual(
      LEFT_SIDE.has(firstGroup),
      LEFT_SIDE.has(secondGroup),
      `${first} and ${second} must be on opposite bracket sides`,
    );
  }
};
