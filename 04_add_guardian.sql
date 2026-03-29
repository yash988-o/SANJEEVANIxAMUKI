-- Execute this script in your Supabase SQL Editor
-- Add guardian, guardian_age, and guardian_gender columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS guardian TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS guardian_age INT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS guardian_gender TEXT;
