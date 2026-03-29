-- Execute this script in your Supabase SQL Editor
-- Add guardian column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS guardian TEXT;
