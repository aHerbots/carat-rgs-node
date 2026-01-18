import WebSocket from 'ws';
import dotenv from 'dotenv';
import pino from 'pino';

dotenv.config({ path: 'rgs-node/.env' });

const logger = pino({
  transport: {
    target: 'pino-pretty',
  },
});

const WS_URL = process.env.WS_URL || 'ws://localhost:3000/ws';

const PLAYER_ID = '00000000-0000-0000-0000-000000000001';

async function setupPlayer() {
  logger.info({ PLAYER_ID }, 'Skipping player setup, using seeded player');
}

async function getBalance() {
  const { data, error } = await supabase
    .from('player_balances')
    .select('balance')
    .eq('player_id', PLAYER_ID)
    .single();
    
  if (error) {
    if (error.code === 'PGRST116') return 0;
    throw error;
  }
  return data.balance;
}

async function runE2E() {
  await setupPlayer();
  
  const startBalance = await getBalance();
  logger.info({ startBalance }, 'Starting balance');

  const ws = new WebSocket(`${WS_URL}?playerId=${PLAYER_ID}`);

  ws.on('open', () => {
    logger.info('WebSocket connected');
    
    const spinRequest = {
      type: 'spin',
      gameId: 'slot-96',
      payload: {
        betAmount: 100, // 1.00
      }
    };
    
    logger.info({ spinRequest }, 'Sending spin request');
    ws.send(JSON.stringify(spinRequest));
  });

  ws.on('message', async (data) => {
    const message = JSON.parse(data.toString());
    logger.info({ message }, 'Received message');

    if (message.type === 'slotState') {
      logger.info('Spin completed successfully');
      
      // Wait a bit for Temporal activities to finish settling if needed 
      // (though handle.result() should mean it's done)
      setTimeout(async () => {
        const endBalance = await getBalance();
        const { winAmount } = message.payload;
        const expectedBalance = startBalance - 100 + winAmount;
        
        logger.info({ 
          startBalance, 
          endBalance, 
          winAmount, 
          expectedBalance 
        }, 'Financial Audit');

        if (endBalance === expectedBalance) {
          logger.info('✅ E2E Flow Verified: Balance matches expected value');
        } else {
          logger.error('❌ E2E Flow Failed: Balance mismatch');
        }
        
        ws.close();
      }, 1000);
    }

    if (message.type === 'error') {
      logger.error({ error: message.payload?.message }, 'Spin failed');
      ws.close();
      process.exit(1);
    }
  });

  ws.on('error', (err) => {
    logger.error({ err }, 'WebSocket error');
    process.exit(1);
  });

  ws.on('close', () => {
    logger.info('WebSocket closed');
  });
}

runE2E().catch(err => {
  logger.error(err);
  process.exit(1);
});
