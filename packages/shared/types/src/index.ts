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
  playerId: string;
  betAmount: number;
  gameId: string;
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

/**
 * Wallet Transaction types.
 */
export type TransactionType = "bet" | "win" | "refund";

/**
 * Record representing a financial movement.
 */
export interface Transaction {
  id: string;
  playerId: string;
  amount: number; // Stored in minor units (e.g., cents)
  type: TransactionType;
  referenceId: string; // Workflow ID / Idempotency Key
  createdAt: string;
}

/**
 * Player Balance info.
 */
export interface WalletBalance {
  playerId: string;
  balance: number;
}
