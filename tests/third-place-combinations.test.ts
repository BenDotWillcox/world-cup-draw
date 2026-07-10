import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ANNEXE_C_COLUMN_MATCH_IDS,
  ANNEXE_C_COMBINATION_COUNT,
  ANNEXE_C_UNIQUE_COMBINATION_COUNT,
  getAnnexeCThirdPlaceGroups,
} from '@/lib/data/third-place-combinations';
import { THIRD_PLACE_SLOTS } from '@/lib/data/knockout-schedule';
import { GROUP_NAMES } from '@/types/draw';

test('FIFA Annexe C contains one assignment for every 8-of-12 group combination', () => {
  assert.equal(ANNEXE_C_COMBINATION_COUNT, 495);
  assert.equal(ANNEXE_C_UNIQUE_COMBINATION_COUNT, 495);

  const combinations = choose(GROUP_NAMES, 8);
  assert.equal(combinations.length, 495);

  for (const groups of combinations) {
    const assignment = getAnnexeCThirdPlaceGroups(groups);
    assert.deepEqual(Object.keys(assignment), [...ANNEXE_C_COLUMN_MATCH_IDS]);
    assert.deepEqual(new Set(Object.values(assignment)), new Set(groups));

    for (const [matchId, group] of Object.entries(assignment)) {
      assert.ok(
        THIRD_PLACE_SLOTS[matchId]?.includes(group),
        `Annexe C assigned Group ${group} outside ${matchId}'s permitted groups`,
      );
    }
  }
});

test('Annexe C option 1 matches the published column order', () => {
  assert.deepEqual(getAnnexeCThirdPlaceGroups(['E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']), {
    M79: 'E',
    M85: 'J',
    M81: 'I',
    M74: 'F',
    M82: 'H',
    M77: 'G',
    M87: 'L',
    M80: 'K',
  });
});

test('Annexe C option 495 matches the published final row', () => {
  assert.deepEqual(getAnnexeCThirdPlaceGroups(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']), {
    M79: 'H',
    M85: 'G',
    M81: 'B',
    M74: 'C',
    M82: 'A',
    M77: 'F',
    M87: 'D',
    M80: 'E',
  });
});

function choose<T>(values: readonly T[], size: number): T[][] {
  const combinations: T[][] = [];

  const visit = (start: number, selected: T[]) => {
    if (selected.length === size) {
      combinations.push([...selected]);
      return;
    }

    for (let index = start; index <= values.length - (size - selected.length); index++) {
      selected.push(values[index]);
      visit(index + 1, selected);
      selected.pop();
    }
  };

  visit(0, []);
  return combinations;
}
