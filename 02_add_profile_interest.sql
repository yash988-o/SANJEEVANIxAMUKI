-- Execute this script in your Supabase SQL Editor

ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS interest_rate DECIMAL(5,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS interest_freq TEXT DEFAULT NULL;
