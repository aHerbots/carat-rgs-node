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

const PLAYER_ID = 'idempotency-test-player-' + Math.random().toString(36).substring(7);
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

async function runIdempotencyTest() {
  await setupPlayer();
  
  const referenceId = 'idempotency-ref-' + Math.random().toString(36).substring(7);
  
  logger.info({ referenceId }, 'Running Idempotency Test (Wallet Activities)');

  // 1. First Reserve
  logger.info('Executing first reserveFunds');
  const { error: err1 } = await supabase.from('transactions').insert({
    player_id: PLAYER_ID,
    amount: -100,
    type: 'bet',
    reference_id: referenceId,
  });
  
  if (err1) throw err1;
  const balanceAfterFirst = await getBalance();
  logger.info({ balanceAfterFirst }, 'Balance after first bet');

  // 2. Second Reserve (Should be idempotent in wallet-activities.ts)
  // Here we simulate what the activity does: it catches the 23505 error
  logger.info('Executing second reserveFunds (simulating Temporal retry)');
  const { error: err2 } = await supabase.from('transactions').insert({
    player_id: PLAYER_ID,
    amount: -100,
    type: 'bet',
    reference_id: referenceId,
  });

  if (err2 && err2.code === '23505') {
    logger.info('✅ Database correctly rejected duplicate reference_id (code 23505)');
  } else if (!err2) {
    logger.error('❌ Database failed to reject duplicate reference_id');
  } else {
    logger.error({ err2 }, 'Unexpected error during second bet');
  }

  const balanceAfterSecond = await getBalance();
  logger.info({ balanceAfterSecond }, 'Balance after second (failed) bet');

  if (balanceAfterFirst === balanceAfterSecond) {
    logger.info('✅ Idempotency Verified: Balance remains consistent');
  } else {
    logger.error('❌ Idempotency Failed: Balance changed on duplicate request');
  }
  
  // 3. Test Refund Compensation Idempotency
  logger.info('Testing Refund Idempotency');
  await supabase.from('transactions').insert({
    player_id: PLAYER_ID,
    amount: 100,
    type: 'refund',
    reference_id: referenceId,
  });
  
  const { error: err3 } = await supabase.from('transactions').insert({
    player_id: PLAYER_ID,
    amount: 100,
    type: 'refund',
    reference_id: referenceId,
  });

  if (err3 && err3.code === '23505') {
    logger.info('✅ Database correctly rejected duplicate refund');
  } else {
    logger.error('❌ Database failed to reject duplicate refund');
  }
}

runIdempotencyTest().catch(err => {
  logger.error(err);
  process.exit(1);
});
