import { FastifyInstance } from "fastify";
import { WorkflowClient } from "@temporalio/client";
import { SpinRequest, SpinResult } from "@rgs/types";
import { customAlphabet } from "nanoid";

const nanoid = customAlphabet("1234567890abcdef", 10);

export default async function spinRoutes(fastify: FastifyInstance) {
  const temporalClient = fastify.temporal as WorkflowClient;

  fastify.post("/spin", async (request, reply) => {
    const payload = request.body as SpinRequest;

    if (!payload.playerId || !payload.betAmount || !payload.gameId) {
      return reply.status(400).send({ error: "Missing required fields" });
    }

    const workflowId = `spin-${payload.playerId}-${nanoid()}`;

    try {
      const handle = await temporalClient.start("SpinWorkflow", {
        args: [payload],
        taskQueue: "shared-workflows-task-queue",
        workflowId,
      });

      fastify.log.info({ workflowId }, "Started Spin Workflow");

      const result = await handle.result();
      return reply.send(result);
    } catch (err: any) {
      fastify.log.error(err, "Spin Workflow failed");
      return reply.status(500).send({
        error: "Game round failed",
        message: err.message,
      });
    }
  });
}
