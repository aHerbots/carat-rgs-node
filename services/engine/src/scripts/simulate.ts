import { Simulator } from '../simulation/simulator';
import { SLOT_96 } from '../domain/profiles';
import { CryptoGenerator } from '../domain/rng';

async function main() {
  const args = process.argv.slice(2);
  let iterations = 100000; // Default

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-n' && i + 1 < args.length) {
      iterations = parseInt(args[i + 1], 10);
      i++;
    }
  }

  if (isNaN(iterations) || iterations <= 0) {
    console.error('Invalid number of iterations. Usage: tsx simulate.ts [-n <iterations>]');
    process.exit(1);
  }

  console.log(`Loading profile: ${SLOT_96.name} (Target RTP: ${SLOT_96.rtp}%)`);
  console.log(`Starting simulation with ${iterations} iterations...`);

  const rng = new CryptoGenerator();
  const simulator = new Simulator(SLOT_96, rng);

  const report = await simulator.run(iterations);

  console.log('--------------------------------------------------');
  console.log(`Simulation Complete in ${(report.durationMs / 1000).toFixed(2)}s`);
  console.log(`Total Bet:   ${report.totalBet}`);
  console.log(`Total Win:   ${report.totalWin}`);
  console.log(`Actual RTP:  ${report.rtp.toFixed(4)}%`);
  console.log(`Hit Rate:    ${report.hitRate.toFixed(4)}%`);
  console.log(`Volatility:  ${report.volatility.toFixed(4)}`);
  console.log('--------------------------------------------------');
}

main().catch((err) => {
  console.error('Simulation failed:', err);
  process.exit(1);
});