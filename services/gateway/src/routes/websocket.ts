import { FastifyInstance } from "fastify";
import { WorkflowClient } from "@temporalio/client";
import { SpinRequest } from "@rgs/types";
import { customAlphabet } from "nanoid";

const nanoid = customAlphabet("1234567890abcdef", 10);

export default async function websocketRoutes(fastify: FastifyInstance) {
  const temporalClient = fastify.temporal as WorkflowClient;

  fastify.get("/ws", { websocket: true }, (socket, req) => {
    fastify.log.info("WebSocket connection established");

    socket.on("message", async (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        fastify.log.info({ data }, "Received WebSocket message");

        if (data.action === "SPIN") {
          const payload = data.payload as SpinRequest;

          if (!payload.playerId || !payload.betAmount || !payload.gameId) {
            socket.send(
              JSON.stringify({
                type: "ERROR",
                error: "Missing required fields in spin request",
              })
            );
            return;
          }

          const workflowId = `spin-${payload.playerId}-${nanoid()}`;

          try {
            const handle = await temporalClient.start("SpinWorkflow", {
              args: [payload],
              taskQueue: "shared-workflows-task-queue",
              workflowId,
            });

            fastify.log.info({ workflowId }, "Started Spin Workflow via WebSocket");

            const result = await handle.result();
            socket.send(
              JSON.stringify({
                type: "SPIN_RESULT",
                payload: result,
              })
            );
          } catch (err: any) {
            fastify.log.error(err, "Spin Workflow failed via WebSocket");
            socket.send(
              JSON.stringify({
                type: "ERROR",
                error: "Game round failed",
                message: err.message,
              })
            );
          }
        } else {
          socket.send(
            JSON.stringify({
              type: "ERROR",
              error: `Unknown action: ${data.action}`,
            })
          );
        }
      } catch (err: any) {
        fastify.log.error(err, "Failed to parse WebSocket message");
        socket.send(
          JSON.stringify({
            type: "ERROR",
            error: "Invalid message format",
          })
        );
      }
    });

    socket.on("close", () => {
      fastify.log.info("WebSocket connection closed");
    });
  });
}
