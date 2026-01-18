import { NativeConnection, Worker } from "@temporalio/worker";
import { SpinWorkflow } from "./workflows.js";
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

  logger.info({ temporalAddress }, "Starting Shared Workflows Worker");

  try {
    const connection = await NativeConnection.connect({
      address: temporalAddress,
    });

    const worker = await Worker.create({
      connection,
      workflowsPath: new URL("./workflows.ts", import.meta.url).pathname,
      taskQueue: "shared-workflows-task-queue",
    });

    logger.info("Shared Workflows Worker connected to Temporal");

    await worker.run();
  } catch (err) {
    logger.error(err, "Shared Workflows Worker failed to start");
    process.exit(1);
  }
}

run();
