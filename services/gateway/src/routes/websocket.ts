import { FastifyInstance } from "fastify";
import { WorkflowClient } from "@temporalio/client";
import { SpinRequest, SpinResult } from "@rgs/types";
import { customAlphabet } from "nanoid";

const nanoid = customAlphabet("1234567890abcdef", 10);

export default async function websocketRoutes(fastify: FastifyInstance) {
  const temporalClient = fastify.temporal as WorkflowClient;

  fastify.get("/ws", { websocket: true }, (socket, req) => {
    fastify.log.info("WebSocket connection established");

    // Establish session context (playerId, gameId)
    const playerId = (req.query as any).playerId || "00000000-0000-0000-0000-000000000001";
    const gameId = (req.query as any).gameId || "slot-96-profile";

    fastify.log.info({ playerId, gameId }, "Session established for WebSocket");

    socket.on("message", async (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        fastify.log.info({ data }, "Received WebSocket message");

        if (data.type === "spin") {
          const betAmount = data.payload?.betAmount;
          const gameIdFromMsg = data.gameId || gameId;

          if (!betAmount) {
            socket.send(
              JSON.stringify({
                type: "error",
                payload: {
                  message: "Missing betAmount in spin request",
                },
              })
            );
            return;
          }

          const spinRequest: SpinRequest = {
            playerId,
            gameId: gameIdFromMsg,
            betAmount,
          };

          const workflowId = `spin-${playerId}-${nanoid()}`;

          fastify.log.info({ spinRequest, workflowId }, "Attempting to start Spin Workflow");
          const handle = await temporalClient.start("SpinWorkflow", {
            args: [spinRequest],
            taskQueue: "shared-workflows-task-queue",
            workflowId,
          });

          fastify.log.info({ workflowId }, "Started Spin Workflow via WebSocket");

          const result: SpinResult = await handle.result();
          fastify.log.info({ workflowId }, "CRITICAL: Received workflow result");

          if (result.error) {
            fastify.log.error(result.error, "Spin Workflow failed via WebSocket");
            socket.send(
              JSON.stringify({
                type: "error",
                payload: {
                  message: result.error.message || "Game round failed",
                  cause: result.error.cause,
                  details: result.error.details,
                },
              })
            );
          } else {
            socket.send(
              JSON.stringify({
                type: "slotState",
                gameId: gameIdFromMsg,
                payload: {
                  grid: result.grid,
                  winAmount: result.winAmount,
                  balance: result.balance,
                },
              })
            );
          }
        } else {
          fastify.log.warn({ type: data.type }, "Unhandled WebSocket message type");
          socket.send(
            JSON.stringify({
              type: "error",
              payload: {
                message: `Unknown action type: ${data.type}`,
              },
            })
          );
        }
      } catch (err: any) {
        fastify.log.error(err, "Failed to parse WebSocket message");
        socket.send(
          JSON.stringify({
            type: "error",
            payload: {
              message: "Invalid message format",
            },
          })
        );
      }
    });

    socket.on("close", () => {
      fastify.log.info("WebSocket connection closed");
    });
  });
}