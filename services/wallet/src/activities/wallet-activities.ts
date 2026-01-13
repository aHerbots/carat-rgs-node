import { Context } from "@temporalio/activity";
import { supabase } from "../db/supabase.js";
import { TransactionType } from "@rgs/types";
import pino from "pino";

const logger = pino({
  transport: {
    target: "pino-pretty",
  },
});

export async function reserveFunds(
  playerId: string,
  amount: number,
  referenceId: string
): Promise<void> {
  logger.info({ playerId, amount, referenceId }, "Reserving funds");

  // In a real system, we'd use a stored procedure for atomic balance check + insert.
  // For this implementation, we'll use a transaction via Supabase RPC or multiple calls if needed.
  // Here we use the unique constraint on (reference_id, type) for idempotency.

  // 1. Check balance
  const { data: balanceData, error: balanceError } = await supabase
    .from("player_balances")
    .select("balance")
    .eq("player_id", playerId)
    .single();

  if (balanceError && balanceError.code !== "PGRST116") {
    // PGRST116 is 'no rows found', which might mean 0 balance if they never had a transaction
    throw new Error(`Failed to fetch balance: ${balanceError.message}`);
  }

  const currentBalance = balanceData?.balance || 0;
  if (currentBalance < amount) {
    throw new Error("Insufficient funds");
  }

  // 2. Insert 'bet' transaction
  // amount is negative for bets
  const { error: txError } = await supabase.from("transactions").insert({
    player_id: playerId,
    amount: -Math.abs(amount),
    type: "bet" as TransactionType,
    reference_id: referenceId,
  });

  if (txError) {
    if (txError.code === "23505") {
      // Unique violation - already reserved
      logger.warn({ referenceId }, "Funds already reserved (idempotent)");
      return;
    }
    throw new Error(`Failed to reserve funds: ${txError.message}`);
  }

  logger.info({ playerId, referenceId }, "Funds reserved successfully");
}

export async function settleFunds(
  playerId: string,
  amount: number,
  referenceId: string
): Promise<void> {
  if (amount <= 0) {
    logger.info({ referenceId }, "No win to settle");
    return;
  }

  logger.info({ playerId, amount, referenceId }, "Settling funds");

  const { error: txError } = await supabase.from("transactions").insert({
    player_id: playerId,
    amount: Math.abs(amount),
    type: "win" as TransactionType,
    reference_id: referenceId,
  });

  if (txError) {
    if (txError.code === "23505") {
      logger.warn({ referenceId }, "Funds already settled (idempotent)");
      return;
    }
    throw new Error(`Failed to settle funds: ${txError.message}`);
  }

  logger.info({ playerId, referenceId }, "Funds settled successfully");
}

export async function refundBet(
  playerId: string,
  amount: number,
  referenceId: string
): Promise<void> {
  logger.info({ playerId, amount, referenceId }, "Refunding bet");

  // Check if a bet was actually placed
  const { data: betData, error: betError } = await supabase
    .from("transactions")
    .select("id")
    .eq("reference_id", referenceId)
    .eq("type", "bet")
    .single();

  if (betError) {
    if (betError.code === "PGRST116") {
      logger.warn({ referenceId }, "No bet found to refund (compensation skip)");
      return;
    }
    throw new Error(`Failed to check bet for refund: ${betError.message}`);
  }

  const { error: txError } = await supabase.from("transactions").insert({
    player_id: playerId,
    amount: Math.abs(amount), // refund is positive
    type: "refund" as TransactionType,
    reference_id: referenceId,
  });

  if (txError) {
    if (txError.code === "23505") {
      logger.warn({ referenceId }, "Bet already refunded (idempotent)");
      return;
    }
    throw new Error(`Failed to refund bet: ${txError.message}`);
  }

  logger.info({ playerId, referenceId }, "Bet refunded successfully");
}
