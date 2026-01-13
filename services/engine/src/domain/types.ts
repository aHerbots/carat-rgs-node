export interface MathProfile {
  name: string;
  rtp: number;
  reel_strips: number[][]; // 5 arrays of symbol IDs
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
