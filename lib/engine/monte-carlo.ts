import { runFastSimulation } from './fast-sim';

export type SimulationResult = {
  groupProbabilities: Record<string, Record<string, number>>; // TeamID -> GroupName -> Count
  opponentCounts: Record<string, Record<string, number>>; // TeamID -> OpponentID -> Count
};

export const runMonteCarlo = async (iterations: number = 1000): Promise<SimulationResult> => {
  // Yield once to let UI show "Running..." state
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // Run synchronous fast sim (it's fast enough to block for ~100ms even for 10k runs)
  try {
    return runFastSimulation(iterations);
  } catch (e) {
    console.error("Fast Sim Error:", e);
    throw e;
  }
};
