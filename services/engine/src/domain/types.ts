export interface MathProfile {
  name: string;
  rtp: number;
  rows: number;
  cols: number;
  wildSymbolId: number;
  reel_strips: number[][]; // arrays of symbol IDs per column
  paylines: number[][];    // List of coordinate sequences (row indices for each column)
  pay_table: Record<number, Record<number, number>>; // SymbolID -> Count -> Payout (multiplier)
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
}
