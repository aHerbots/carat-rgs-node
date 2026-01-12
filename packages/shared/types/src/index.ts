/**
 * Core game mathematical configuration.
 * Ported from carat-backend/pkg/math/profile.go
 */
export interface GameProfile {
  name: string;
  rtp: number;
  diceWeights?: Record<number, number>;
  pointsTable?: PointsTable;
  gridMultipliers?: Record<number, number>;
  nineAlikeBonus?: number;
  pointValue?: number;
  mysteryTrigger?: number;
  mysteryGamesAwarded?: number;

  // Slot Specific
  reelStrips?: number[][];
  paylines?: number[][];
  payTable?: Record<number, Record<number, number>>;
}

export interface PointsTable {
  threeOfAKind?: Record<string, number>;
}

/**
 * Request to perform a spin.
 * Derived from carat-backend/pkg/api/websocket/message.go (SpinPayload)
 */
export interface SpinRequest {
  betAmount: number;
}

/**
 * Result of a game spin.
 * Ported from carat-backend/pkg/game/slot/slot.go
 */
export interface SpinResult {
  grid: number[][];
  winAmount: number;
  isWin: boolean;
  winLines: WinLine[];
}

/**
 * Individual winning line detail.
 * Ported from carat-backend/pkg/game/slot/slot.go
 */
export interface WinLine {
  lineIndex: number;
  symbol: number;
  count: number;
  amount: number;
}
