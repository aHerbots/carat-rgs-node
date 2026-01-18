import { Generator } from './rng';
import { MathProfile, SpinResult, WinLine } from './types';
import { Money } from '@rgs/utils/src/Money';

export class SlotMachine {
  constructor(
    private readonly rng: Generator,
    private readonly profile: MathProfile
  ) {}

  async spin(betAmount: number): Promise<SpinResult> {
    if (betAmount <= 0) {
      throw new Error(`invalid bet amount: ${betAmount}`);
    }

    const { rows, cols, wildSymbolId, reel_strips, paylines, pay_table } = this.profile;

    const grid: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));
    const result: SpinResult = {
      grid,
      winAmount: 0,
      isWin: false,
      winLines: [],
    };

    // 1. Generate Grid using ReelStrips
    if (reel_strips.length < cols) {
      // Fallback to random if no strips or insufficient strips
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          grid[r][c] = (await this.rng.intn(6)) + 1;
        }
      }
    } else {
      for (let c = 0; c < cols; c++) {
        const strip = reel_strips[c];
        if (!strip || strip.length === 0) continue;

        const idx = await this.rng.intn(strip.length);
        for (let r = 0; r < rows; r++) {
          const symbolIdx = (idx + r) % strip.length;
          grid[r][c] = strip[symbolIdx];
        }
      }
    }

    // 2. Evaluate Paylines
    if (paylines.length > 0) {
      const numLines = paylines.length;
      const lineBetCents = Math.floor(betAmount / numLines);
      let totalWinMoney = Money.fromMinor(0);

      for (let lineIdx = 0; lineIdx < numLines; lineIdx++) {
        const coords = paylines[lineIdx];
        if (coords.length < cols) continue;

        // Find the first non-wild symbol as the target
        let targetSymbol = wildSymbolId;
        for (let c = 0; c < cols; c++) {
          const sym = grid[coords[c]][c];
          if (sym !== wildSymbolId) {
            targetSymbol = sym;
            break;
          }
        }

        // Count matches starting from left
        let count = 0;
        for (let c = 0; c < cols; c++) {
          const sym = grid[coords[c]][c];
          if (sym === targetSymbol || sym === wildSymbolId) {
            count++;
          } else {
            break;
          }
        }

        // Lookup Win in pay table
        const payouts = pay_table[targetSymbol.toString()];
        if (payouts) {
          const payoutMult = payouts[count.toString()];
          if (payoutMult !== undefined && payoutMult > 0) {
            const lineWinAmount = payoutMult * lineBetCents;
            if (lineWinAmount > 0) {
              const lineWinMoney = Money.fromMinor(lineWinAmount);
              totalWinMoney = totalWinMoney.add(lineWinMoney);
              
              result.isWin = true;
              result.winLines.push({
                lineIndex: lineIdx,
                symbol: targetSymbol,
                count,
                amount: lineWinAmount,
              });
            }
          }
        }
      }
      result.winAmount = totalWinMoney.toMinor();
    }

    return result;
  }
}