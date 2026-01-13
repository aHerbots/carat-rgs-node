import { SlotMachine } from './domain/slot-machine';
import { SLOT_96 } from './domain/profiles';
import { CryptoGenerator } from './domain/rng';

async function verify() {
  console.log('Starting Engine Refactor Verification...');
  
  const rng = new CryptoGenerator();
  const machine = new SlotMachine(rng, SLOT_96);
  
  const betAmount = 1000; // 10 EUR in cents
  console.log(`Running spin with bet: ${betAmount} cents`);
  
  const result = await machine.spin(betAmount);
  
  console.log('Grid Generated:');
  console.table(result.grid);
  
  console.log(`Win Amount: ${result.winAmount} cents`);
  console.log(`Is Win: ${result.isWin}`);
  
  if (result.winLines.length > 0) {
    console.log('Win Lines:');
    console.table(result.winLines);
  }

  // Basic structure checks
  if (result.grid.length !== SLOT_96.rows) {
    throw new Error(`Grid rows mismatch. Expected ${SLOT_96.rows}, got ${result.grid.length}`);
  }
  if (result.grid[0].length !== SLOT_96.cols) {
    throw new Error(`Grid columns mismatch. Expected ${SLOT_96.cols}, got ${result.grid[0].length}`);
  }

  console.log('Verification Successful!');
}

verify().catch(err => {
  console.error('Verification Failed:', err);
  process.exit(1);
});
