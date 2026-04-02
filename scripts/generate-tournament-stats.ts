import fs from 'fs';
import path from 'path';
import { runTournamentSimulation } from '../lib/engine/tournament-sim';

async function main() {
  const iterations = 1_000_000;
  console.log(`Running tournament simulation (${iterations.toLocaleString()} iterations)...`);
  const start = Date.now();

  const results = runTournamentSimulation(iterations);

  const end = Date.now();
  console.log(`Simulation complete in ${((end - start) / 1000).toFixed(2)}s`);

  // Quick sanity check
  const usa = results.roundReach['USA'];
  console.log(`USA reach rates: R32=${(usa.R32/iterations*100).toFixed(1)}% R16=${(usa.R16/iterations*100).toFixed(1)}% QF=${(usa.QF/iterations*100).toFixed(1)}% SF=${(usa.SF/iterations*100).toFixed(1)}% F=${(usa.F/iterations*100).toFixed(1)}% W=${(usa.W/iterations*100).toFixed(1)}%`);
  const esp = results.roundReach['ESP'];
  console.log(`ESP reach rates: R32=${(esp.R32/iterations*100).toFixed(1)}% R16=${(esp.R16/iterations*100).toFixed(1)}% QF=${(esp.QF/iterations*100).toFixed(1)}% SF=${(esp.SF/iterations*100).toFixed(1)}% F=${(esp.F/iterations*100).toFixed(1)}% W=${(esp.W/iterations*100).toFixed(1)}%`);

  const outputPath = path.join(process.cwd(), 'lib', 'data', 'tournament-sim-results.json');

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

  console.log(`Results written to ${outputPath}`);
}

main().catch(console.error);
