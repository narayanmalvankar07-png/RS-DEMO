-- Run this in your Supabase SQL Editor to add the missing bio, avatar, and social_links columns to the rs_user_profiles table.

ALTER TABLE rs_user_profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE rs_user_profiles ADD COLUMN IF NOT EXISTS avatar text;
ALTER TABLE rs_user_profiles ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}';
ALTER TABLE rs_user_profiles ADD COLUMN IF NOT EXISTS about_us text;
ALTER TABLE rs_user_profiles ADD COLUMN IF NOT EXISTS subscription_plan text DEFAULT 'free';
ALTER TABLE rs_user_profiles ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'inactive';
ALTER TABLE rs_user_profiles ADD COLUMN IF NOT EXISTS subscription_expires_at timestamp with time zone;