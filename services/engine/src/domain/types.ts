export interface MathProfile {
  name: string;
  rtp: number;
  rows: number;
  cols: number;
  wildSymbolId: number;
  reel_strips: number[][];
  paylines: number[][];
  pay_table: {
    [symbolId: string]: {
      [count: string]: number;
    };
  };
}

export interface WinLine {
  lineIndex: number;
  symbol: number;
  count: number;
  amount: number;
}

export interface SpinResult {
  grid: number[][]; // 4 rows, 5 columns
  winAmount: number; // Win amount in cents
  isWin: boolean;
  winLines: WinLine[];
  balance?: number;
  error?: any;
}