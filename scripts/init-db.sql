-- Create the temporal database if it doesn't exist
SELECT 'CREATE DATABASE temporal'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'temporal')\gexec

-- Optional: Create visibility database if you want to separate it later
-- SELECT 'CREATE DATABASE temporal_visibility'
-- WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'temporal_visibility')\gexec

-- Wallet Ledger Schema
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL,
  amount BIGINT NOT NULL, -- Stored in minor units
  type TEXT NOT NULL CHECK (type IN ('bet', 'win', 'refund')),
  reference_id TEXT NOT NULL, -- Idempotency Key (Workflow ID)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure idempotency by adding a unique constraint on reference_id and type
-- This prevents double-processing of the same transaction type for the same reference
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_reference_type ON transactions (reference_id, type);

-- Index for player balance calculations
CREATE INDEX IF NOT EXISTS idx_transactions_player_id ON transactions (player_id);

-- View for easy balance checks
CREATE OR REPLACE VIEW player_balances AS
SELECT 
  player_id,
  SUM(amount) as balance
FROM transactions
GROUP BY player_id;
