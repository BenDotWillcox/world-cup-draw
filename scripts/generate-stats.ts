import fs from 'fs';
import path from 'path';
import { runMonteCarlo } from '../lib/engine/monte-carlo';

async function main() {
  console.log("Running Monte Carlo simulation (1,000,000 iterations)...");
  const start = Date.now();
  
  // Run a heavy simulation for high precision
  const results = await runMonteCarlo(1000000);
  
  const end = Date.now();
  console.log(`Simulation complete in ${((end - start) / 1000).toFixed(2)}s`);
  
  const outputPath = path.join(process.cwd(), 'lib', 'data', 'monte-carlo-results.json');
  
  // Ensure directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  
  console.log(`✅ Results written to ${outputPath}`);
}

main().catch(console.error);

