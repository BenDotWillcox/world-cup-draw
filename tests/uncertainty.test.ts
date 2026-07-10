import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getBinomialEstimate, getWorstCaseUncertainty } from '@/lib/statistics/uncertainty';

test('binomial estimate returns the expected standard error and Wilson interval', () => {
  const estimate = getBinomialEstimate(50, 100);

  assert.equal(estimate.percentage, 50);
  assert.equal(estimate.standardErrorPercentagePoints, 5);
  assert.ok(Math.abs(estimate.confidenceInterval95.lowPercentage - 40.383) < 0.001);
  assert.ok(Math.abs(estimate.confidenceInterval95.highPercentage - 59.617) < 0.001);
});

test('Wilson intervals stay within probability bounds at the extremes', () => {
  const none = getBinomialEstimate(0, 100);
  const all = getBinomialEstimate(100, 100);

  assert.equal(none.confidenceInterval95.lowPercentage, 0);
  assert.ok(none.confidenceInterval95.highPercentage > 0);
  assert.ok(all.confidenceInterval95.lowPercentage < 100);
  assert.equal(all.confidenceInterval95.highPercentage, 100);
});

test('one million trials publish the documented worst-case uncertainty', () => {
  const uncertainty = getWorstCaseUncertainty(1_000_000);

  assert.equal(uncertainty.standardErrorPercentagePoints, 0.05);
  assert.ok(Math.abs(uncertainty.marginOfError95PercentagePoints - 0.097998) < 0.000001);
});
