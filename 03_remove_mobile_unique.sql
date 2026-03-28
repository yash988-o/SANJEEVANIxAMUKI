-- Execute this script in your Supabase SQL Editor

-- In most Supabase projects, the unique constraint on the mobile column 
-- is named 'profiles_mobile_key'. We need to remove it to allow multiple people 
-- to share the same mobile number.
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_mobile_key;
