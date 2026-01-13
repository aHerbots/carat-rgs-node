import { Worker } from "@temporalio/worker";
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
    const worker = await Worker.create({
      workflowsPath: new URL("./workflows.js", import.meta.url).pathname,
      taskQueue: "shared-workflows-task-queue",
      address: temporalAddress,
    });

    logger.info("Shared Workflows Worker connected to Temporal");

    await worker.run();
  } catch (err) {
    logger.error(err, "Shared Workflows Worker failed to start");
    process.exit(1);
  }
}

run();
