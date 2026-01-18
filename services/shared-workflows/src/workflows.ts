import { proxyActivities, workflowInfo } from "@temporalio/workflow";
import type * as walletActivities from "../../wallet/src/activities/wallet-activities";
import type * as engineActivities from "../../engine/src/activities";
import type { SpinRequest, SpinResult } from "@rgs/types";
import { SLOT_96 } from "../../engine/src/domain/profiles";

const { reserveFunds, refundBet } = proxyActivities<typeof walletActivities>({
  taskQueue: "wallet-task-queue",
  startToCloseTimeout: "1 minute",
});

const { settleFunds: settleFundsPersistent } = proxyActivities<typeof walletActivities>({
  taskQueue: "wallet-task-queue",
  startToCloseTimeout: "1 minute",
  retry: {
    initialInterval: "1s",
    backoffCoefficient: 2,
    maximumInterval: "10 minutes",
  },
});

const { executeSpin } = proxyActivities<typeof engineActivities>({
  taskQueue: "engine-tasks",
  startToCloseTimeout: "30 seconds",
});

export async function SpinWorkflow(request: SpinRequest): Promise<SpinResult> {
  const { workflowId } = workflowInfo();

  console.log("Starting SpinWorkflow", { workflowId, playerId: request.playerId, betAmount: request.betAmount });

  let currentBalance: number;

  // 1. Reserve Funds (Bet)
  try {
    console.log("Reserving funds", { playerId: request.playerId, amount: request.betAmount });
    currentBalance = await reserveFunds(request.playerId, request.betAmount, workflowId);
    console.log("Funds reserved", { playerId: request.playerId, newBalance: currentBalance });
  } catch (err: any) {
    console.error("Failed to reserve funds", { playerId: request.playerId, error: err.message });
    return {
      grid: [],
      winAmount: 0,
      isWin: false,
      winLines: [],
      balance: 0,
      error: err,
    };
  }

  try {
    // 2. Execute Game Logic
    console.log("Executing game logic", { betAmount: request.betAmount });
    const result = await executeSpin({
      betAmount: request.betAmount,
      profile: SLOT_96,
    });
    console.log("Game logic executed", { winAmount: result.winAmount });

    // 3. Settle Win
    if (result.winAmount > 0) {
      console.log("Settling win", { playerId: request.playerId, amount: result.winAmount });
      currentBalance = await settleFundsPersistent(request.playerId, result.winAmount, workflowId);
      console.log("Win settled", { playerId: request.playerId, newBalance: currentBalance });
    }

    console.log("SpinWorkflow completed successfully", { workflowId, finalBalance: currentBalance! });

    return {
      grid: result.grid,
      winAmount: result.winAmount,
      isWin: result.isWin,
      winLines: result.winLines,
      balance: currentBalance!,
    } as any;
  } catch (err: any) {
    // 4. Compensation (Refund)
    console.error("Game logic failed, initiating refund", { playerId: request.playerId, error: err.message });
    await refundBet(request.playerId, request.betAmount, workflowId);
    console.log("Refund processed", { playerId: request.playerId });
    return {
      grid: [],
      winAmount: 0,
      isWin: false,
      winLines: [],
      balance: 0,
      error: err,
    };
  }
}