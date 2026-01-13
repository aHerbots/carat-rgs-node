import { Generator } from './rng';
import { MathProfile, SpinResult, WinLine } from './types';

export class SlotMachine {
  constructor(
    private readonly rng: Generator,
    private readonly profile: MathProfile
  ) {}

  async spin(betAmount: number): Promise<SpinResult> {
    if (betAmount <= 0) {
      throw new Error(`invalid bet amount: ${betAmount}`);
    }

    const grid: number[][] = Array.from({ length: 4 }, () => Array(5).fill(0));
    const result: SpinResult = {
      grid,
      winAmount: 0,
      isWin: false,
      winLines: [],
    };

    // 1. Generate Grid using ReelStrips
    if (this.profile.reel_strips.length !== 5) {
      // Fallback to random if no strips
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 5; c++) {
          grid[r][c] = (await this.rng.intn(6)) + 1;
        }
      }
    } else {
      for (let c = 0; c < 5; c++) {
        const strip = this.profile.reel_strips[c];
        if (!strip || strip.length === 0) continue;

        const idx = await this.rng.intn(strip.length);
        for (let r = 0; r < 4; r++) {
          const symbolIdx = (idx + r) % strip.length;
          grid[r][c] = strip[symbolIdx];
        }
      }
    }

    // 2. Evaluate Paylines
    if (this.profile.paylines.length > 0) {
      for (let lineIdx = 0; lineIdx < this.profile.paylines.length; lineIdx++) {
        const coords = this.profile.paylines[lineIdx];
        if (coords.length < 5) continue;

        const firstSym = grid[coords[0]][0];
        let count = 1;
        for (let c = 1; c < 5; c++) {
          const r = coords[c];
          const sym = grid[r][c];

          // TODO: Handle Wilds
          if (sym === firstSym) {
            count++;
          } else {
            break;
          }
        }

        // Lookup Win
        if (count >= 3) {
          const payouts = this.profile.pay_table[firstSym];
          if (payouts) {
            const payoutMult = payouts[count];
            if (payoutMult !== undefined) {
              const numLines = this.profile.paylines.length;
              const lineBet = Math.floor(betAmount / numLines);
              const winAmount = payoutMult * (lineBet || 1);

              if (winAmount > 0) {
                result.isWin = true;
                result.winAmount += winAmount;
                result.winLines.push({
                  lineIndex: lineIdx,
                  symbol: firstSym,
                  count,
                  amount: winAmount,
                });
              }
            }
          }
        }
      }
    }

    return result;
  }
}
