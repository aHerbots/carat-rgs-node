import { proxyActivities, workflowInfo } from "@temporalio/workflow";
import type * as walletActivities from "../../wallet/src/activities/wallet-activities.js";
import type * as engineActivities from "../../engine/src/activities.js";
import type { SpinRequest, SpinResult } from "@rgs/types";
import { SLOT_96 } from "../../engine/src/domain/profiles.js";

const { reserveFunds, refundBet } = proxyActivities<typeof walletActivities>({
  taskQueue: "wallet-task-queue",
  startToCloseTimeout: "1 minute",
  retry: {
    initialInterval: "1s",
    backoffCoefficient: 2,
    maximumInterval: "1 minute",
    maximumAttempts: 5,
  },
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

  // 1. Reserve Funds (Bet)
  try {
    await reserveFunds(request.playerId, request.betAmount, workflowId);
  } catch (err) {
    throw err;
  }

  try {
    // 2. Execute Game Logic
    const result = await executeSpin({
      betAmount: request.betAmount,
      profile: SLOT_96,
    });

    // 3. Settle Win
    if (result.winAmount > 0) {
      await settleFundsPersistent(request.playerId, result.winAmount, workflowId);
    }

    return result;
  } catch (err) {
    // 4. Compensation (Refund)
    await refundBet(request.playerId, request.betAmount, workflowId);
    throw err;
  }
}
