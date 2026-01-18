import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import temporalPlugin from './plugins/temporal.js';
import healthRoutes from './routes/health.js';
import spinRoutes from './routes/spin.js';
import websocketRoutes from './routes/websocket.js';

const fastify = Fastify({
  pluginTimeout: 3000,
  logger: {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
      },
    },
  },
});

// Register plugins
await fastify.register(websocket);
await fastify.register(temporalPlugin);

// Auth Middleware (Mocked for local development without Supabase)
fastify.addHook('preHandler', async (request, reply) => {
  // Skip auth for health check and WebSocket (handled separately)
  if (request.url === '/health' || request.url === '/ws') return;

  const authHeader = request.headers.authorization;
  if (!authHeader) {
    // For local dev, we might want to allow default player if no header
    (request as any).user = { id: '00000000-0000-0000-0000-000000000000', email: 'dev@example.com' };
    return;
  }

  const token = authHeader.replace('Bearer ', '');
  
  // Mock user from token or just return a default dev user
  // In a real system without Supabase, you'd verify a JWT here
  (request as any).user = { 
    id: token === 'test-token' ? '00000000-0000-0000-0000-000000000000' : token,
    email: 'dev@example.com' 
  };
});

// Register routes
await fastify.register(healthRoutes);
await fastify.register(spinRoutes);
await fastify.register(websocketRoutes);

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000');
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    console.log(`Gateway service listening on ${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();