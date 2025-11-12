-- Add twitch_username column to live_streams table
ALTER TABLE live_streams 
ADD COLUMN IF NOT EXISTS twitch_username text;