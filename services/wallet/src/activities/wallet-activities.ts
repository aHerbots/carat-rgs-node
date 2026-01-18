import { Context } from "@temporalio/activity";
import prisma from "../db/db.js";
import { TransactionType } from "@rgs/types";
import pino from "pino";

const logger = pino({
  transport: {
    target: "pino-pretty",
  },
});

export async function getBalance(playerId: string): Promise<number> {
  const result = await prisma.transaction.aggregate({
    where: {
      playerId: playerId,
    },
    _sum: {
      amount: true,
    },
  });

  const balance = result._sum.amount || BigInt(0);
  return Number(balance);
}

export async function reserveFunds(
  playerId: string,
  amount: number,
  referenceId: string
): Promise<number> {
  logger.info({ playerId, amount, referenceId }, "Reserving funds");

  // 1. Check balance
  const currentBalance = await getBalance(playerId);
  if (currentBalance < amount) {
    throw new Error("Insufficient funds");
  }

  // 2. Insert 'bet' transaction
  try {
    await prisma.transaction.create({
      data: {
        playerId: playerId,
        amount: BigInt(-Math.abs(amount)),
        type: "bet",
        referenceId: referenceId,
      },
    });
  } catch (error: any) {
    // Prisma unique constraint violation code is 'P2002'
    if (error.code === "P2002") {
      logger.warn({ referenceId }, "Funds already reserved (idempotent)");
      return await getBalance(playerId);
    }
    throw new Error(`Failed to reserve funds: ${error.message}`);
  }

  logger.info({ playerId, referenceId }, "Funds reserved successfully");
  return await getBalance(playerId);
}

export async function settleFunds(
  playerId: string,
  amount: number,
  referenceId: string
): Promise<number> {
  if (amount <= 0) {
    logger.info({ referenceId }, "No win to settle");
    return await getBalance(playerId);
  }

  logger.info({ playerId, amount, referenceId }, "Settling funds");

  try {
    await prisma.transaction.create({
      data: {
        playerId: playerId,
        amount: BigInt(Math.abs(amount)),
        type: "win",
        referenceId: referenceId,
      },
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      logger.warn({ referenceId }, "Funds already settled (idempotent)");
      return await getBalance(playerId);
    }
    throw new Error(`Failed to settle funds: ${error.message}`);
  }

  logger.info({ playerId, referenceId }, "Funds settled successfully");
  return await getBalance(playerId);
}

export async function refundBet(
  playerId: string,
  amount: number,
  referenceId: string
): Promise<void> {
  logger.info({ playerId, amount, referenceId }, "Refunding bet");

  // Check if a bet was actually placed
  const bet = await prisma.transaction.findFirst({
    where: {
      referenceId: referenceId,
      type: "bet",
    },
  });

  if (!bet) {
    logger.warn({ referenceId }, "No bet found to refund (compensation skip)");
    return;
  }

  try {
    await prisma.transaction.create({
      data: {
        playerId: playerId,
        amount: BigInt(Math.abs(amount)),
        type: "refund",
        referenceId: referenceId,
      },
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      logger.warn({ referenceId }, "Bet already refunded (idempotent)");
      return;
    }
    throw new Error(`Failed to refund bet: ${error.message}`);
  }

  logger.info({ playerId, referenceId }, "Bet refunded successfully");
}