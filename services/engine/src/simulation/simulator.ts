import { SlotMachine } from '../domain/slot-machine';
import { MathProfile } from '../domain/types';
import { Generator } from '../domain/rng';

export interface SimulationReport {
  iterations: number;
  totalBet: number;
  totalWin: number;
  rtp: number;
  durationMs: number;
  hitRate: number;
  volatility: number;
}

export class Simulator {
  constructor(
    private readonly profile: MathProfile,
    private readonly rng: Generator
  ) {}

  async run(iterations: number): Promise<SimulationReport> {
    const start = Date.now();
    let totalBet = 0;
    let totalWin = 0;
    let winCount = 0;
    const wins: number[] = [];

    const machine = new SlotMachine(this.rng, this.profile);

    for (let i = 0; i < iterations; i++) {
      const bet = 100; // Fixed bet of 100 cents
      totalBet += bet;

      const result = await machine.spin(bet);
      totalWin += result.winAmount;
      if (result.winAmount > 0) {
        winCount++;
      }
      wins.push(result.winAmount);
    }

    const durationMs = Date.now() - start;
    const rtp = totalBet > 0 ? (totalWin / totalBet) * 100 : 0;
    const hitRate = (winCount / iterations) * 100;
    const mean = totalWin / iterations;
    const volatility = Math.sqrt(
      wins.map((w) => Math.pow(w - mean, 2)).reduce((a, b) => a + b) /
        wins.length
    );

    return {
      iterations,
      totalBet,
      totalWin,
      rtp,
      durationMs,
      hitRate,
      volatility,
    };
  }
}