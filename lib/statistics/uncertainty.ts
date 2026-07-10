const Z_95 = 1.959963984540054;

export interface BinomialEstimate {
  probability: number;
  percentage: number;
  standardErrorPercentagePoints: number;
  confidenceInterval95: {
    lowPercentage: number;
    highPercentage: number;
  };
}

/** Calculate a binomial standard error and 95% Wilson score interval. */
export function getBinomialEstimate(successes: number, trials: number): BinomialEstimate {
  if (!Number.isFinite(trials) || trials <= 0) {
    return {
      probability: 0,
      percentage: 0,
      standardErrorPercentagePoints: 0,
      confidenceInterval95: { lowPercentage: 0, highPercentage: 0 },
    };
  }

  const boundedSuccesses = Math.min(Math.max(successes, 0), trials);
  const probability = boundedSuccesses / trials;
  const standardError = Math.sqrt((probability * (1 - probability)) / trials);
  const zSquared = Z_95 * Z_95;
  const denominator = 1 + zSquared / trials;
  const center = (probability + zSquared / (2 * trials)) / denominator;
  const halfWidth =
    (Z_95 / denominator) *
    Math.sqrt((probability * (1 - probability)) / trials + zSquared / (4 * trials * trials));

  return {
    probability,
    percentage: probability * 100,
    standardErrorPercentagePoints: standardError * 100,
    confidenceInterval95: {
      lowPercentage: clampProbability(center - halfWidth) * 100,
      highPercentage: clampProbability(center + halfWidth) * 100,
    },
  };
}

function clampProbability(value: number): number {
  if (value < 1e-12) return 0;
  if (value > 1 - 1e-12) return 1;
  return value;
}

export function getWorstCaseUncertainty(trials: number) {
  const estimate = getBinomialEstimate(trials / 2, trials);
  return {
    standardErrorPercentagePoints: estimate.standardErrorPercentagePoints,
    marginOfError95PercentagePoints:
      (estimate.confidenceInterval95.highPercentage - estimate.confidenceInterval95.lowPercentage) / 2,
  };
}

export function formatEstimateTitle(successes: number, trials: number): string {
  const estimate = getBinomialEstimate(successes, trials);
  return [
    `${estimate.percentage.toFixed(2)}%`,
    `SE ${estimate.standardErrorPercentagePoints.toFixed(3)} percentage points`,
    `95% CI ${estimate.confidenceInterval95.lowPercentage.toFixed(2)}–${estimate.confidenceInterval95.highPercentage.toFixed(2)}%`,
  ].join(' · ');
}
