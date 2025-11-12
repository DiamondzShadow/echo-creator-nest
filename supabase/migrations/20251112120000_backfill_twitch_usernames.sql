-- Backfill twitch_username for existing Twitch streams
-- This ensures viewers can watch Twitch streams even if they were created before the twitch_username column was added

UPDATE live_streams ls
SET twitch_username = tc.twitch_username
FROM twitch_connections tc
WHERE ls.user_id = tc.user_id
  AND ls.livepeer_playback_id LIKE 'twitch_%'
  AND ls.twitch_username IS NULL;

-- Add comment
COMMENT ON COLUMN live_streams.twitch_username IS 'Twitch channel username for Twitch streams (populated from twitch_connections). Allows public viewing without requiring access to twitch_connections table.';
