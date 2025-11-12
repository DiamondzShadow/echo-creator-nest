# Migration Instructions for Twitch Stream Fix

## ⚠️ IMPORTANT: Manual SQL Execution Required

The code fix is complete, but existing Twitch streams need a database migration that requires elevated privileges.

## What's Already Fixed ✅

1. **Frontend Code** - Updated to read `twitch_username` from `live_streams` table
2. **TypeScript Interfaces** - Added `twitch_username` field
3. **Twitch Webhook** - Already populates `twitch_username` for new streams
4. **Database Schema** - `twitch_username` column already exists in `live_streams` table

## What Needs to Be Done

### Option 1: Run SQL in Supabase Studio (Recommended)

1. Go to [Supabase Studio](https://supabase.com/dashboard/project/woucixqbnzmvlvnaaelb/sql)
2. Click on "SQL Editor"
3. Copy and paste this SQL:

```sql
-- Backfill twitch_username for existing Twitch streams
UPDATE live_streams ls
SET twitch_username = tc.twitch_username
FROM twitch_connections tc
WHERE ls.user_id = tc.user_id
  AND ls.livepeer_playback_id LIKE 'twitch_%'
  AND ls.twitch_username IS NULL;

-- Add comment
COMMENT ON COLUMN live_streams.twitch_username IS 'Twitch channel username for Twitch streams (populated from twitch_connections). Allows public viewing without requiring access to twitch_connections table.';
```

4. Click "Run" to execute
5. Check the output - it should update 4 streams

### Option 2: Use Supabase CLI with Access Token

If you have Supabase CLI set up:

```bash
# Login to Supabase
npx supabase login

# Link the project
npx supabase link --project-ref woucixqbnzmvlvnaaelb

# Push migrations
npx supabase db push
```

### Option 3: Re-create Streams (Temporary Workaround)

If you can't run the SQL migration right now:

1. Your **new** Twitch streams will work correctly (webhook adds username automatically)
2. Old streams without username won't be viewable by others
3. When you go live on Twitch again, a new stream record will be created with the correct username

## Affected Streams

Found **4 existing Twitch streams** that need the username populated:
- User: diamondzshadow (ID: d25afbc2-ca2b-4af7-999e-d3a1b3a4c870)
- All have `livepeer_playback_id`: twitch_1238507153
- All are missing `twitch_username`

## Testing After Migration

After running the SQL:

1. **As anonymous user** (incognito browser):
   - Go to https://crabbytv.com/discover
   - Click on a Twitch stream
   - Verify it loads and plays

2. **As different user**:
   - Login with another account
   - Navigate to someone else's Twitch stream
   - Confirm it plays correctly

3. **Check the database**:
   ```sql
   SELECT id, title, twitch_username, livepeer_playback_id 
   FROM live_streams 
   WHERE livepeer_playback_id LIKE 'twitch_%';
   ```
   All should now have `twitch_username` populated.

## Why This Fix Works

### Before:
- Viewer tries to watch Twitch stream
- Watch page queries `twitch_connections` table for username
- RLS policy blocks access (only owner can read their own connections)
- ❌ Viewer can't see the stream

### After:
- Twitch webhook stores username in `live_streams` table when stream goes live
- `live_streams` table has public SELECT access
- Watch page reads username from stream record
- ✅ Everyone can view the stream

## Files Modified

- `src/pages/Watch.tsx` - Updated StreamData interface
- `src/pages/Discover.tsx` - Updated LiveStream interface  
- `supabase/migrations/20251112120000_backfill_twitch_usernames.sql` - NEW migration
- `TWITCH_STREAM_VISIBILITY_FIX.md` - Full technical documentation
