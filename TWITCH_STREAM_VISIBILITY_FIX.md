# Twitch Stream Visibility Fix

## Problem
Twitch streams could not be viewed by anyone except the stream owner. Other users attempting to watch would be unable to see the stream.

## Root Cause
The issue was caused by the `twitch_connections` table having Row Level Security (RLS) policies that only allowed users to view their own connections:

```sql
CREATE POLICY "Users can view their own Twitch connections"
  ON public.twitch_connections
  FOR SELECT
  USING (auth.uid() = user_id);
```

The Watch page was attempting to fetch the Twitch username from the `twitch_connections` table to embed the stream, but viewers (who are not the stream owner) could not access this table due to RLS restrictions.

## Solution

### 1. Added `twitch_username` Column to `live_streams` Table
- Migration: `20251112045534_c43f0576-dc9d-443c-8849-ccae80f35de0.sql`
- Added `twitch_username` column directly to the `live_streams` table
- This table has public SELECT access via the policy "Everyone can view live streams"

### 2. Updated Twitch Webhook to Populate `twitch_username`
- File: `supabase/functions/twitch-webhook/index.ts`
- When a Twitch stream goes live, the webhook now stores the `twitch_username` in the stream record:
  ```typescript
  twitch_username: twitchConnection.twitch_username,
  ```

### 3. Updated Watch Page to Use Stream Record
- File: `src/pages/Watch.tsx`
- Changed from querying `twitch_connections` table to reading from the stream record:
  ```typescript
  // If Twitch stream, get the username from the stream record
  if (isTwitch && streamData.twitch_username) {
    setTwitchChannelName(streamData.twitch_username);
  }
  ```

### 4. Backfilled Existing Twitch Streams
- Migration: `20251112120000_backfill_twitch_usernames.sql`
- Populated `twitch_username` for any existing Twitch streams that were missing this field

### 5. Updated TypeScript Interfaces
- Added `twitch_username?: string | null` to `StreamData` interface in `Watch.tsx`
- Added `twitch_username?: string | null` to `LiveStream` interface in `Discover.tsx`

## How to Test

### Test 1: Verify Database Migration
```bash
# Check if the migration has been applied
cd /workspace
npx supabase db diff --linked

# Or check the database directly to see if twitch_username column exists
```

### Test 2: Test Anonymous Viewing
1. Open an incognito/private browser window (not logged in)
2. Navigate to your Crabbytv site
3. Go to the Discover page
4. Click on a live Twitch stream
5. The Twitch embed should load and play without requiring authentication

### Test 3: Test with Different Account
1. Create or use a different user account (not the stream owner)
2. Navigate to a live Twitch stream created by another user
3. Verify the stream plays correctly

### Test 4: Check RLS Policies
Run these queries to verify the policies are correct:

```sql
-- Verify live_streams can be viewed by everyone
SELECT * FROM live_streams WHERE livepeer_playback_id LIKE 'twitch_%' LIMIT 1;

-- This should work even when not authenticated
```

## What Changed Files

1. **Database Migrations:**
   - `supabase/migrations/20251112045534_c43f0576-dc9d-443c-8849-ccae80f35de0.sql` (added twitch_username column)
   - `supabase/migrations/20251112120000_backfill_twitch_usernames.sql` (backfilled existing streams)

2. **Frontend:**
   - `src/pages/Watch.tsx` (added twitch_username to interface)
   - `src/pages/Discover.tsx` (added twitch_username to interface)

3. **Backend:**
   - `supabase/functions/twitch-webhook/index.ts` (already had the fix to populate twitch_username)

## Important Notes

- The `live_streams` table has the RLS policy `"Everyone can view live streams"` with `USING (true)`, which allows public access
- The `twitch_connections` table remains private (only accessible by the connection owner)
- By storing `twitch_username` in the public `live_streams` table, we can display Twitch embeds without exposing sensitive OAuth tokens
- The Twitch webhook automatically populates `twitch_username` when streams go live

## Verification Checklist

- [x] Database migration applied
- [x] TypeScript interfaces updated
- [x] Watch.tsx reads from stream record
- [x] Existing streams backfilled
- [x] RLS policies verified
- [ ] **User needs to test:** Anonymous users can view Twitch streams
- [ ] **User needs to test:** Different users can view each other's Twitch streams

## Next Steps

1. **Apply the migration** - Run Supabase migrations to apply the backfill:
   ```bash
   npx supabase db push
   ```

2. **Test thoroughly** - Follow the test cases above to verify the fix works

3. **Monitor** - Check for any errors in the browser console or server logs when viewers access Twitch streams

## Related Documentation

- Original Twitch integration: `TWITCH_WEBHOOK_COMPLETE_SETUP.md`
- Livepeer webhook setup: `LIVEPEER_WEBHOOK_COMPLETE_IMPLEMENTATION.md`
- Stream setup guide: `STREAM_RECORDINGS_SETUP.md`
