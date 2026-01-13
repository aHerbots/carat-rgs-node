import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import pino from 'pino';

dotenv.config({ path: 'rgs-node/.env' });

const logger = pino({
  transport: {
    target: 'pino-pretty',
  },
});

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const PLAYER_ID = 'compensation-test-player-' + Math.random().toString(36).substring(7);
const INITIAL_BALANCE = 100000;

async function setupPlayer() {
  logger.info({ PLAYER_ID }, 'Setting up test player');
  await supabase.from('transactions').insert({
    player_id: PLAYER_ID,
    amount: INITIAL_BALANCE,
    type: 'deposit',
    reference_id: 'initial-deposit-' + PLAYER_ID,
  });
}

async function getBalance() {
  const { data } = await supabase
    .from('player_balances')
    .select('balance')
    .eq('player_id', PLAYER_ID)
    .single();
  return data?.balance || 0;
}

async function runCompensationTest() {
  await setupPlayer();
  const startBalance = await getBalance();
  const referenceId = 'compensation-ref-' + Math.random().toString(36).substring(7);

  logger.info({ referenceId, startBalance }, 'Running Compensation Test');

  // 1. Simulate workflow step: Reserve Funds
  logger.info('Step 1: Reserving funds (Bet)');
  await supabase.from('transactions').insert({
    player_id: PLAYER_ID,
    amount: -100,
    type: 'bet',
    reference_id: referenceId,
  });

  const balanceAfterBet = await getBalance();
  logger.info({ balanceAfterBet }, 'Balance after bet');

  // 2. Simulate failure (e.g., Engine failure or Win settlement failure)
  logger.info('Step 2: Simulating failure...');

  // 3. Simulate Compensation (Refund)
  logger.info('Step 3: Executing compensation (Refund)');
  await supabase.from('transactions').insert({
    player_id: PLAYER_ID,
    amount: 100,
    type: 'refund',
    reference_id: referenceId,
  });

  const endBalance = await getBalance();
  logger.info({ endBalance }, 'Balance after compensation');

  if (endBalance === startBalance) {
    logger.info('✅ Compensation Verified: Balance restored to initial state');
  } else {
    logger.error('❌ Compensation Failed: Balance mismatch');
  }

  // 4. Verify History
  const { data: txs } = await supabase
    .from('transactions')
    .select('type, amount')
    .eq('reference_id', referenceId)
    .order('created_at', { ascending: true });

  logger.info({ txs }, 'Transaction History for reference');
  if (txs?.length === 2 && txs[0].type === 'bet' && txs[1].type === 'refund') {
    logger.info('✅ Transaction history correctly reflects bet and compensation refund');
  } else {
    logger.error('❌ Transaction history is incorrect');
  }
}

runCompensationTest().catch(err => {
  logger.error(err);
  process.exit(1);
});
