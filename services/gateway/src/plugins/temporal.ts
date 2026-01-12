import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { Connection, WorkflowClient } from '@temporalio/client';

declare module 'fastify' {
  interface FastifyInstance {
    temporal: WorkflowClient;
  }
}

const temporalPlugin: FastifyPluginAsync = async (fastify) => {
  const address = process.env.TEMPORAL_ADDRESS || 'localhost:7233';
  
  fastify.log.info(`Connecting to Temporal at ${address}`);
  
  try {
    const connection = await Connection.connect({ address });
    const client = new WorkflowClient({
      connection,
      namespace: 'default',
    });

    fastify.decorate('temporal', client);
    
    fastify.addHook('onClose', async () => {
      await connection.close();
    });
  } catch (err) {
    fastify.log.error(err, 'Failed to connect to Temporal');
    throw err;
  }
};

export default fp(temporalPlugin, {
  name: 'temporal',
});
