import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import fc from 'fast-check';

import { OFFICIAL_GROUPS } from '@/lib/data/official-draw';
import { TEAMS } from '@/lib/data/teams';
import {
  canPlaceTeamInGroup,
  canPlaceTeamInPot1,
  completeCurrentDraw,
  drawPot,
  drawPot1,
  initializeGroups,
  simulateFullDraw,
  validateConstraintCounts,
} from '@/lib/engine/draw-logic';
import { runFastSimulation } from '@/lib/engine/fast-sim';
import { createSeededRandom } from '@/lib/engine/random';
import {
  getPossibleConfederations,
  type Group,
  type Team,
} from '@/types/draw';

import officialDrawFixture from './fixtures/official-draw.json';
import { assertDrawInvariants } from './helpers/draw-invariants';

const team = (id: string): Team => {
  const result = TEAMS.find(candidate => candidate.id === id);
  assert.ok(result, `test fixture team ${id} must exist`);
  return result;
};

const withSeed = <T>(seed: number, run: () => T): T => {
  const originalRandom = Math.random;
  Math.random = createSeededRandom(seed);
  try {
    return run();
  } finally {
    Math.random = originalRandom;
  }
};

const serializedGroups = (groups: Group[]): Record<string, (string | null)[]> =>
  Object.fromEntries(groups.map(group => [group.name, group.teams.map(assigned => assigned?.id ?? null)]));

describe('team and official-draw fixtures', () => {
  test('the input snapshot contains four unique pots of 12 teams', () => {
    assert.equal(TEAMS.length, 48);
    assert.equal(new Set(TEAMS.map(candidate => candidate.id)).size, 48);

    for (const pot of [1, 2, 3, 4]) {
      assert.equal(TEAMS.filter(candidate => candidate.pot === pot).length, 12, `pot ${pot} must contain 12 teams`);
    }

    assert.deepEqual(
      TEAMS.filter(candidate => candidate.isHost).map(candidate => candidate.id).sort(),
      ['CAN', 'MEX', 'USA'],
    );
  });

  test('playoff placeholders publish non-empty, unique potential-confederation sets', () => {
    const placeholders = TEAMS.filter(candidate => candidate.potentialConfederations);
    assert.deepEqual(placeholders.map(candidate => candidate.id).sort(), ['COD', 'IRQ']);
    assert.deepEqual(
      Object.fromEntries(placeholders.map(candidate => [candidate.id, candidate.potentialConfederations])),
      {
        COD: ['OFC', 'CONCACAF', 'CAF'],
        IRQ: ['CONMEBOL', 'CONCACAF', 'AFC'],
      },
    );

    for (const placeholder of placeholders) {
      const confeds = placeholder.potentialConfederations!;
      assert.ok(confeds.length > 0, `${placeholder.id} must identify at least one possible confederation`);
      assert.equal(new Set(confeds).size, confeds.length, `${placeholder.id} potential confederations must be unique`);
    }
  });

  test('the checked-in official fixture matches the application fixture and all invariants', () => {
    assert.deepEqual(serializedGroups(OFFICIAL_GROUPS), officialDrawFixture);
    assertDrawInvariants(OFFICIAL_GROUPS);
  });
});

describe('placement rules', () => {
  test('non-UEFA duplicates are rejected and a second, but not third, UEFA team is allowed', () => {
    const group = initializeGroups()[0];
    group.teams[0] = team('ESP');
    assert.equal(canPlaceTeamInGroup(team('ENG'), group), true);

    group.teams[1] = team('FRA');
    assert.equal(canPlaceTeamInGroup(team('ENG'), group), false);

    const cafGroup = initializeGroups()[0];
    cafGroup.teams[0] = team('MAR');
    assert.equal(canPlaceTeamInGroup(team('SEN'), cafGroup), false);
    assert.equal(canPlaceTeamInGroup(team('JPN'), cafGroup), true);
  });

  test('every possible confederation of a playoff path is binding in both directions', () => {
    const existingConcrete = initializeGroups()[0];
    existingConcrete.teams[0] = team('NZL');
    assert.equal(canPlaceTeamInGroup(team('COD'), existingConcrete), false, 'COD could resolve to OFC');

    const existingPlaceholder = initializeGroups()[0];
    existingPlaceholder.teams[0] = team('IRQ');
    assert.equal(canPlaceTeamInGroup(team('JPN'), existingPlaceholder), false, 'IRQ could resolve to AFC');

    const couldBeUefa: Team = {
      id: 'TEST-PATH',
      name: 'Test playoff path',
      confederation: 'AFC',
      potentialConfederations: ['AFC', 'UEFA'],
      rank: 999,
      pot: 4,
    };
    const twoUefa = initializeGroups()[0];
    twoUefa.teams[0] = team('ESP');
    twoUefa.teams[1] = team('FRA');
    assert.equal(canPlaceTeamInGroup(couldBeUefa, twoUefa), false);

    const uefaWithPossibleUefa = initializeGroups()[0];
    uefaWithPossibleUefa.teams[0] = couldBeUefa;
    uefaWithPossibleUefa.teams[1] = team('ESP');
    assert.equal(canPlaceTeamInGroup(team('FRA'), uefaWithPossibleUefa), false);
  });

  test('Pot 1 placement protects occupied slots and opposite-side pair constraints', () => {
    const groups = initializeGroups();
    groups[3].teams[0] = team('ESP');

    assert.equal(canPlaceTeamInPot1(team('ARG'), 4, groups), false, 'E is on Spain\'s side');
    assert.equal(canPlaceTeamInPot1(team('ARG'), 9, groups), true, 'J is opposite Spain');
    assert.equal(canPlaceTeamInPot1(team('ARG'), 3, groups), false, 'D is already occupied');
  });

  test('Pot 1 placement fixes and reserves every host group', () => {
    const groups = initializeGroups();
    assert.equal(canPlaceTeamInPot1(team('MEX'), 0, groups), true);
    assert.equal(canPlaceTeamInPot1(team('MEX'), 2, groups), false);
    assert.equal(canPlaceTeamInPot1(team('ESP'), 0, groups), false, 'A must remain reserved for Mexico');
    assert.equal(canPlaceTeamInPot1(team('ESP'), 1, groups), false, 'B must remain reserved for Canada');
    assert.equal(canPlaceTeamInPot1(team('ESP'), 3, groups), false, 'D must remain reserved for USA');
  });

  test('Pot 1 generation fixes hosts and separates constrained pairs across a seed sweep', () => {
    for (let seed = 1; seed <= 24; seed++) {
      const groups = withSeed(seed, () => drawPot1(initializeGroups(), TEAMS.filter(candidate => candidate.pot === 1)));
      assert.equal(groups[0].teams[0]?.id, 'MEX');
      assert.equal(groups[1].teams[0]?.id, 'CAN');
      assert.equal(groups[3].teams[0]?.id, 'USA');

      const groupName = (id: string) => groups.find(group => group.teams[0]?.id === id)?.name;
      const isLeft = (name: string | undefined) => name !== undefined && ['D', 'E', 'F', 'G', 'H', 'I'].includes(name);
      assert.notEqual(isLeft(groupName('ESP')), isLeft(groupName('ARG')));
      assert.notEqual(isLeft(groupName('FRA')), isLeft(groupName('ENG')));
    }
  });
});

describe('completed-draw invariants', () => {
  test('the full draw is reproducible through its explicit random source', () => {
    const first = simulateFullDraw(createSeededRandom('wc01-reproducibility'));
    const second = simulateFullDraw(createSeededRandom('wc01-reproducibility'));
    assert.deepEqual(serializedGroups(first), serializedGroups(second));
    assertDrawInvariants(first);
  });

  test('completion can construct a valid draw from an entirely empty state', () => {
    const completed = completeCurrentDraw(
      initializeGroups(),
      TEAMS,
      createSeededRandom('wc01-empty-state'),
    );
    assertDrawInvariants(completed);
  });

  test('deterministic seed sweep satisfies every draw invariant', () => {
    for (let seed = 1; seed <= 32; seed++) {
      const groups = withSeed(seed, simulateFullDraw);
      assertDrawInvariants(groups);
    }
  });

  test('randomized partial valid draws can be completed without moving retained teams', () => {
    for (let seed = 101; seed <= 112; seed++) {
      withSeed(seed, () => {
        const fullDraw = simulateFullDraw();
        const partialDraw = fullDraw.map(group => ({ ...group, teams: [...group.teams] }));
        const retained = new Map<string, string>();
        const unplaced: Team[] = [];

        partialDraw.forEach(group => {
          group.teams.forEach((assigned, positionIndex) => {
            assert.ok(assigned);
            if (!assigned.isHost && Math.random() < 0.45) {
              unplaced.push(assigned);
              group.teams[positionIndex] = null;
            } else {
              retained.set(assigned.id, `${group.name}:${positionIndex}`);
            }
          });
        });

        const completed = completeCurrentDraw(partialDraw, unplaced);
        assertDrawInvariants(completed);

        for (const [teamId, expectedPosition] of retained) {
          const actualGroup = completed.find(group => group.teams.some(assigned => assigned?.id === teamId));
          assert.ok(actualGroup);
          assert.equal(`${actualGroup.name}:${actualGroup.teams.findIndex(assigned => assigned?.id === teamId)}`, expectedPosition);
        }
      });
    }
  });
});

describe('property-based randomized invariants', () => {
  test('arbitrary random-stream seeds always produce a valid completed draw', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 64 }),
        seed => {
          const groups = simulateFullDraw(createSeededRandom(seed));
          assertDrawInvariants(groups);
        },
      ),
      { numRuns: 64, seed: 20260710 },
    );
  });

  test('arbitrary subsets of a valid draw can be completed without moving retained teams', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 64 }),
        fc.uniqueArray(fc.integer({ min: 0, max: 47 }), { maxLength: 12 }),
        fc.string({ minLength: 1, maxLength: 64 }),
        (drawSeed, removalIndices, completionSeed) => {
          const fullDraw = simulateFullDraw(createSeededRandom(drawSeed));
          const partialDraw = fullDraw.map(group => ({ ...group, teams: [...group.teams] }));
          const retained = new Map<string, string>();
          const unplaced: Team[] = [];
          const removalSet = new Set(removalIndices);
          let maskIndex = 0;

          partialDraw.forEach(group => {
            group.teams.forEach((assigned, positionIndex) => {
              assert.ok(assigned);
              const shouldRemove = removalSet.has(maskIndex++);
              if (!assigned.isHost && shouldRemove) {
                unplaced.push(assigned);
                group.teams[positionIndex] = null;
              } else {
                retained.set(assigned.id, `${group.name}:${positionIndex}`);
              }
            });
          });

          const completed = completeCurrentDraw(
            partialDraw,
            unplaced,
            createSeededRandom(completionSeed),
          );
          assertDrawInvariants(completed);

          for (const [teamId, expectedPosition] of retained) {
            const actualGroup = completed.find(group =>
              group.teams.some(assigned => assigned?.id === teamId),
            );
            assert.ok(actualGroup);
            assert.equal(
              `${actualGroup.name}:${actualGroup.teams.findIndex(assigned => assigned?.id === teamId)}`,
              expectedPosition,
            );
          }
        },
      ),
      { numRuns: 32, seed: 20260710 },
    );
  });
});

describe('impossible-state behavior', () => {
  const impossibleCafState = (): Group[] => {
    const groups = initializeGroups();
    groups.forEach((group, index) => {
      group.teams[0] = {
        id: `CAF-BLOCKER-${index}`,
        name: `CAF blocker ${index}`,
        confederation: 'CAF',
        rank: 1000 + index,
        pot: 1,
      };
    });
    return groups;
  };

  test('solvers return null/false and preserve their input when no legal group exists', () => {
    const groups = impossibleCafState();
    const snapshot = structuredClone(groups);
    const remaining = [team('MAR')];

    assert.equal(withSeed(7, () => drawPot(groups, remaining, 2)), null);
    assert.equal(validateConstraintCounts(groups, remaining), false);
    assert.deepEqual(groups, snapshot);
  });

  test('completion throws a stable, explicit error and preserves the impossible input', () => {
    const groups = impossibleCafState();
    const snapshot = structuredClone(groups);

    assert.throws(
      () => withSeed(7, () => completeCurrentDraw(groups, [team('MAR')])),
      { message: 'Could not complete draw from current state' },
    );
    assert.deepEqual(groups, snapshot);
  });
});

describe('fast Monte Carlo engine invariants', () => {
  test('seeded aggregate results place every team once and never pair teams from the same pot', () => {
    const iterations = 250;
    const first = runFastSimulation(iterations, createSeededRandom(2026));
    const second = runFastSimulation(iterations, createSeededRandom(2026));
    assert.deepEqual(first, second, 'the same seed must reproduce the same aggregate result');
    assert.equal(first.iterations, iterations);
    assert.ok(first.attempts >= iterations);
    assert.equal(first.rejectedIterations, first.attempts - first.iterations);

    for (const candidate of TEAMS) {
      const groupTotal = Object.values(first.groupProbabilities[candidate.id]).reduce((sum, count) => sum + count, 0);
      const opponentTotal = Object.values(first.opponentCounts[candidate.id]).reduce((sum, count) => sum + count, 0);
      assert.equal(groupTotal, iterations, `${candidate.id} must appear once per simulated draw`);
      assert.equal(opponentTotal, iterations * 3, `${candidate.id} must have three opponents per simulated draw`);

      for (const samePotTeam of TEAMS.filter(other => other.pot === candidate.pot && other.id !== candidate.id)) {
        assert.equal(
          first.opponentCounts[candidate.id][samePotTeam.id],
          0,
          `${candidate.id} cannot share a group with same-pot team ${samePotTeam.id}`,
        );
      }
    }

    assert.equal(first.groupProbabilities.MEX.A, iterations);
    assert.equal(first.groupProbabilities.CAN.B, iterations);
    assert.equal(first.groupProbabilities.USA.D, iterations);
  });

  test('seeded results never pair teams with overlapping possible non-UEFA confederations', () => {
    const results = runFastSimulation(250, createSeededRandom(20260710));

    for (const candidate of TEAMS) {
      for (const opponent of TEAMS) {
        if (candidate.id === opponent.id) continue;
        const overlap = getPossibleConfederations(candidate).some(
          confed => confed !== 'UEFA' && getPossibleConfederations(opponent).includes(confed),
        );
        if (overlap) {
          assert.equal(
            results.opponentCounts[candidate.id][opponent.id],
            0,
            `${candidate.id} and ${opponent.id} have an overlapping possible confederation`,
          );
        }
      }
    }
  });
});
