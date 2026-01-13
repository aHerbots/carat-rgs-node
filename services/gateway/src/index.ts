import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import { createClient } from '@supabase/supabase-js';
import temporalPlugin from './plugins/temporal.js';
import healthRoutes from './routes/health.js';
import spinRoutes from './routes/spin.js';
import websocketRoutes from './routes/websocket.js';

const fastify = Fastify({
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

// Supabase Client Setup
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Auth Middleware (preHandler hook)
fastify.addHook('preHandler', async (request, reply) => {
  // Skip auth for health check and WebSocket (handled separately)
  if (request.url === '/health' || request.url === '/ws') return;

  const authHeader = request.headers.authorization;
  if (!authHeader) {
    reply.code(401).send({ error: 'Unauthorized: Missing token' });
    return;
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    fastify.log.warn({ error }, 'Authentication failed');
    reply.code(401).send({ error: 'Unauthorized: Invalid token' });
    return;
  }

  // Attach user to request for downstream routes
  (request as any).user = user;
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
