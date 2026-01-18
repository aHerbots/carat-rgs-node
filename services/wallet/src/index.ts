import { NativeConnection, Worker } from "@temporalio/worker";
import * as activities from "./activities/wallet-activities.js";
import pino from "pino";
import dotenv from "dotenv";

dotenv.config();

const logger = pino({
  transport: {
    target: "pino-pretty",
  },
});

async function run() {
  const temporalAddress = process.env.TEMPORAL_ADDRESS || "temporal:7233";

  logger.info({ temporalAddress }, "Starting Wallet Activity Worker");

  try {
    const connection = await NativeConnection.connect({
      address: temporalAddress,
    });

    const worker = await Worker.create({
      connection,
      activities,
      taskQueue: "wallet-task-queue",
    });

    logger.info("Wallet Worker connected to Temporal");

    await worker.run();
  } catch (err) {
    logger.error(err, "Wallet Worker failed to start");
    process.exit(1);
  }
}

run();
