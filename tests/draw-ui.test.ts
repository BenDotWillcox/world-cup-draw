import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { OFFICIAL_GROUPS } from '@/lib/data/official-draw';
import {
  getDrawCenterPrompt,
  getDrawStatusText,
  getReturnToPotLabel,
  isDrawComplete,
} from '@/lib/draw-ui';
import { initializeGroups } from '@/lib/engine/draw-logic';

describe('draw status presentation', () => {
  test('completion takes precedence over the active pot and never reports a waiting state', () => {
    assert.equal(isDrawComplete(OFFICIAL_GROUPS), true);
    assert.equal(
      getDrawStatusText({
        isOfficialDraw: false,
        isComplete: true,
        isRunning: true,
        currentPot: 4,
      }),
      'Draw Complete',
    );
    assert.equal(getDrawCenterPrompt(null, true), 'All 48 teams placed');
  });

  test('incomplete and official states have distinct labels', () => {
    assert.equal(isDrawComplete(initializeGroups()), false);
    assert.equal(
      getDrawStatusText({
        isOfficialDraw: false,
        isComplete: false,
        isRunning: true,
        currentPot: 3,
      }),
      'Drawing Pot 3',
    );
    assert.equal(
      getDrawStatusText({
        isOfficialDraw: true,
        isComplete: true,
        isRunning: false,
        currentPot: 1,
      }),
      'Official Draw',
    );
  });

  test('removal labels include the team, group, and pot and are unique for a completed draw', () => {
    const labels = OFFICIAL_GROUPS.flatMap(group =>
      group.teams.map((team, index) => {
        assert.ok(team);
        return getReturnToPotLabel(team, group.name, index + 1);
      }),
    );

    assert.equal(labels.length, 48);
    assert.equal(new Set(labels).size, 48);
    assert.match(labels[0], /^Return .+ from Group [A-L] to Pot [1-4]$/);
  });
});
