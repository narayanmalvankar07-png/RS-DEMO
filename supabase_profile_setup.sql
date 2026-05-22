-- Run this in your Supabase SQL Editor to add the missing bio, avatar, and social_links columns to the rs_user_profiles table.

ALTER TABLE rs_user_profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE rs_user_profiles ADD COLUMN IF NOT EXISTS avatar text;
ALTER TABLE rs_user_profiles ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}';