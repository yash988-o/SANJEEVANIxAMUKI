-- Supabase Migration Script
-- Execute this script in your Supabase project's SQL Editor

-- 1. Add columns to support Soft Delete, Payment Mode, and Categories
ALTER TABLE transactions 
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS deleted_by UUID,
  ADD COLUMN IF NOT EXISTS payment_mode TEXT DEFAULT 'Cash',
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General';
  
-- 2. Create the interest_config table to store dynamic interest rates
CREATE TABLE IF NOT EXISTS interest_config (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  rate_type TEXT NOT NULL UNIQUE, -- 'monthly', 'daily', 'yearly'
  rate_value DECIMAL(5,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Insert default interest rate configurations if none exist
INSERT INTO interest_config (rate_type, rate_value) 
VALUES 
  ('monthly', 1.50),
  ('yearly', 18.00)
ON CONFLICT (rate_type) DO NOTHING;
