import WebSocket from 'ws';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import pino from 'pino';

dotenv.config({ path: 'rgs-node/.env' });

const logger = pino({
  transport: {
    target: 'pino-pretty',
  },
});

const WS_URL = process.env.WS_URL || 'ws://localhost:3000/ws';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const PLAYER_ID = 'e2e-test-player-' + Math.random().toString(36).substring(7);
const INITIAL_BALANCE = 100000; // 1000.00 in cents

async function setupPlayer() {
  logger.info({ PLAYER_ID }, 'Setting up test player');
  
  // Create player and initial balance
  // We'll use the 'deposit' transaction type to set initial balance
  const { error: txError } = await supabase.from('transactions').insert({
    player_id: PLAYER_ID,
    amount: INITIAL_BALANCE,
    type: 'deposit',
    reference_id: 'initial-deposit-' + PLAYER_ID,
  });

  if (txError) {
    logger.error({ txError }, 'Failed to setup player balance');
    process.exit(1);
  }
  
  logger.info('Test player setup complete');
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

  const ws = new WebSocket(WS_URL);

  ws.on('open', () => {
    logger.info('WebSocket connected');
    
    const spinRequest = {
      action: 'SPIN',
      payload: {
        playerId: PLAYER_ID,
        gameId: 'slot-96',
        betAmount: 100, // 1.00
      }
    };
    
    logger.info({ spinRequest }, 'Sending spin request');
    ws.send(JSON.stringify(spinRequest));
  });

  ws.on('message', async (data) => {
    const message = JSON.parse(data.toString());
    logger.info({ message }, 'Received message');

    if (message.type === 'SPIN_RESULT') {
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

    if (message.type === 'ERROR') {
      logger.error({ error: message.error }, 'Spin failed');
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
