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

const FIXED_BET = 100; // Fixed bet of 100 cents for simulation

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
    const winMultipliers: number[] = [];

    const machine = new SlotMachine(this.rng, this.profile);

    for (let i = 0; i < iterations; i++) {
      const bet = FIXED_BET;
      totalBet += bet;

      const result = await machine.spin(bet);
      totalWin += result.winAmount;
      if (result.winAmount > 0) {
        winCount++;
      }
      wins.push(result.winAmount);
      winMultipliers.push(result.winAmount / bet);
    }

    const durationMs = Date.now() - start;
    const rtp = totalBet > 0 ? (totalWin / totalBet) * 100 : 0;
    const hitRate = (winCount / iterations) * 100;
    const meanMultiplier = totalWin / totalBet;
    const volatility = Math.sqrt(
      winMultipliers.map((w) => Math.pow(w - meanMultiplier, 2)).reduce((a, b) => a + b) /
        winMultipliers.length
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