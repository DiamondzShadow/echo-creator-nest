# Twitch Stream Webhook - Complete Setup ✅

## 🎉 Summary

The Twitch Stream Webhook system has been **fully implemented**! When users go live on Twitch, their streams will automatically appear on CrabbyTV with full embedding support.

## ✅ What Was Implemented

### 1. Database Schema
- ✅ Created `twitch_eventsub_subscriptions` table to track webhook subscriptions
- ✅ Stores subscription IDs, types, and status for each user
- ✅ Includes RLS policies for security
- ✅ Migration file: `supabase/migrations/20251111000000_create_twitch_subscriptions.sql`

### 2. Edge Function Updates

#### `twitch-oauth` Function (Updated)
- ✅ **Automatic Subscription Creation**: When users connect their Twitch account, EventSub subscriptions are automatically created for `stream.online` and `stream.offline` events
- ✅ **Subscription Cleanup**: When users disconnect, all subscriptions are deleted from both Twitch and the database
- ✅ Added helper functions: `createEventSubSubscription()` and `deleteEventSubSubscription()`
- ✅ Uses service role key for database operations

#### `twitch-webhook` Function (Already Existed)
- ✅ Receives webhook notifications from Twitch EventSub
- ✅ Verifies HMAC-SHA256 signatures for security
- ✅ Creates entries in `live_streams` table when streams start
- ✅ Updates entries when streams end
- ✅ Handles webhook verification challenges
- ✅ Fetches stream details from Twitch API (title, game, thumbnail, viewers)

### 3. Frontend Components

#### Watch Page (`src/pages/Watch.tsx`)
- ✅ Added support for detecting Twitch streams (`livepeer_playback_id` starts with `twitch_`)
- ✅ Fetches Twitch channel name from `twitch_connections` table
- ✅ Embeds Twitch stream using `TwitchEmbed` component
- ✅ Shows proper live status and stream information

#### LiveStreamCard Component (`src/components/LiveStreamCard.tsx`)
- ✅ Added Twitch badge indicator (purple badge with Twitch logo)
- ✅ Automatically detects Twitch streams
- ✅ Displays on stream cards in Discover page

#### Discover Page (`src/pages/Discover.tsx`)
- ✅ Updated to pass `livepeer_playback_id` and other Twitch-specific data
- ✅ Twitch streams appear alongside regular CrabbyTV streams
- ✅ Shows Twitch badge on stream cards

## 🚀 Deployment Instructions

### Step 1: Apply Database Migration

**Option A: Via Supabase Dashboard (Recommended)**
1. Go to [Supabase SQL Editor](https://supabase.com/dashboard/project/woucixqbnzmvlvnaaelb/sql)
2. Open the file: `supabase/migrations/20251111000000_create_twitch_subscriptions.sql`
3. Copy the SQL content and paste it into the SQL Editor
4. Click "Run" to execute the migration

**Option B: Via Supabase CLI**
```bash
npx supabase db push
```

### Step 2: Set Environment Secrets

Add these secrets to your Supabase project:

**Via Supabase Dashboard:**
1. Go to [Project Settings → Edge Functions](https://supabase.com/dashboard/project/woucixqbnzmvlvnaaelb/settings/functions)
2. Scroll to "Secrets" section
3. Add the following secrets:

| Secret Name | Value |
|-------------|-------|
| `TWITCH_CLIENT_ID` | `hdm6ufl160ptki0gbht94s57515oyj` |
| `TWITCH_CLIENT_SECRET` | `fitqshriphdq13pamofhyxnq79534m` |

**Or via CLI:**
```bash
npx supabase secrets set TWITCH_CLIENT_ID=hdm6ufl160ptki0gbht94s57515oyj
npx supabase secrets set TWITCH_CLIENT_SECRET=fitqshriphdq13pamofhyxnq79534m
```

### Step 3: Deploy Edge Functions

```bash
# Deploy the updated twitch-oauth function
npx supabase functions deploy twitch-oauth --project-ref woucixqbnzmvlvnaaelb

# Deploy twitch-webhook function (if not already deployed)
npx supabase functions deploy twitch-webhook --project-ref woucixqbnzmvlvnaaelb
```

### Step 4: Deploy Frontend Changes

Push the updated frontend code to your hosting platform (Lovable, Vercel, etc.):

```bash
git add .
git commit -m "Add Twitch stream webhook integration and display support"
git push
```

## 🎯 How It Works - Complete Flow

### User Connects Twitch Account:
1. User clicks "Connect Twitch" in CrabbyTV
2. OAuth redirect to Twitch authorization page
3. User authorizes CrabbyTV
4. `twitch-oauth` function:
   - Exchanges auth code for access token
   - Stores credentials in `twitch_connections` table
   - **Creates EventSub subscriptions** for `stream.online` and `stream.offline`
   - Saves subscription IDs to `twitch_eventsub_subscriptions` table

### User Goes Live on Twitch:
1. Twitch detects stream is online
2. Twitch sends webhook notification to CrabbyTV
3. `twitch-webhook` function:
   - Verifies HMAC signature (security)
   - Looks up user by `twitch_user_id`
   - Fetches stream details from Twitch API (title, game, thumbnail, viewers)
   - **Creates entry in `live_streams` table** with:
     - `is_live = true`
     - `livepeer_playback_id = twitch_{user_id}`
     - `livepeer_stream_id = twitch_{user_id}_{timestamp}`
     - Stream title, description, thumbnail, viewer count

### Stream Appears on CrabbyTV:
1. **Discover Page**: Stream appears in "Live Now" tab
   - Shows Twitch badge (purple with logo)
   - Displays thumbnail from Twitch
   - Shows viewer count
2. **Watch Page**: When user clicks stream
   - Detects it's a Twitch stream (playback ID starts with `twitch_`)
   - Fetches channel name from `twitch_connections`
   - **Embeds Twitch stream** using `TwitchEmbed` component
   - Shows chat, tips, reactions, and full creator profile

### User Ends Stream on Twitch:
1. Twitch detects stream is offline
2. Twitch sends webhook notification
3. `twitch-webhook` function:
   - Updates `live_streams` entry
   - Sets `is_live = false`
   - Sets `ended_at` timestamp
4. Stream disappears from "Live Now" but remains in history

### User Disconnects Twitch:
1. User clicks "Disconnect" in settings
2. `twitch-oauth` function:
   - Fetches all subscription IDs for user
   - **Deletes subscriptions from Twitch** via API
   - Removes entries from `twitch_eventsub_subscriptions` table
   - Removes entry from `twitch_connections` table

## 🧪 Testing Guide

### Test 1: Connect Twitch Account ✓

1. Log in to CrabbyTV
2. Go to Live page → Twitch tab
3. Click "Connect Twitch"
4. Authorize on Twitch
5. **Verify**: Check function logs

```bash
npx supabase functions logs twitch-oauth --project-ref woucixqbnzmvlvnaaelb
```

Expected logs:
```
Connection saved successfully
Creating EventSub subscriptions...
Created stream.online subscription: [id]
Created stream.offline subscription: [id]
```

6. **Verify**: Check database

```sql
-- Should return 1 row with your Twitch credentials
SELECT * FROM twitch_connections WHERE user_id = auth.uid();

-- Should return 2 rows (stream.online and stream.offline)
SELECT * FROM twitch_eventsub_subscriptions WHERE user_id = auth.uid();
```

### Test 2: Go Live on Twitch ✓

1. Start a stream on Twitch
2. Wait up to 60 seconds for webhook
3. **Verify**: Check webhook logs

```bash
npx supabase functions logs twitch-webhook --project-ref woucixqbnzmvlvnaaelb
```

Expected logs:
```
Received webhook: { messageType: 'notification', messageId: '...' }
Event type: stream.online
Found user: { user_id: '...', twitch_username: '...' }
Created live stream: { ... }
```

4. **Verify**: Stream appears on CrabbyTV
   - Go to Discover page
   - Should see your stream in "Live Now" tab
   - Should have purple Twitch badge
   - Should show thumbnail from Twitch

5. **Verify**: Watch page works
   - Click on your stream
   - Should see embedded Twitch stream
   - Should be able to see chat, reactions, tips

### Test 3: End Stream ✓

1. Stop your Twitch stream
2. Wait up to 60 seconds
3. **Verify**: Stream disappears from "Live Now"
4. **Verify**: Database updated

```sql
SELECT is_live, ended_at FROM live_streams 
WHERE user_id = auth.uid() 
ORDER BY created_at DESC LIMIT 1;
-- Should show is_live = false and ended_at with timestamp
```

### Test 4: Disconnect Twitch ✓

1. Go to Settings → disconnect Twitch
2. **Verify**: Database cleanup

```sql
-- Both should return 0 rows
SELECT * FROM twitch_connections WHERE user_id = auth.uid();
SELECT * FROM twitch_eventsub_subscriptions WHERE user_id = auth.uid();
```

## 📊 Database Tables Reference

### `twitch_connections`
- Stores OAuth credentials for each user
- Links CrabbyTV `user_id` to Twitch `twitch_user_id`
- Contains `access_token` for API calls
- Contains `refresh_token` for automatic renewal

### `twitch_eventsub_subscriptions`
- Tracks active EventSub subscriptions
- One row per subscription type (online/offline) per user
- Stores `subscription_id` from Twitch for deletion
- Stores `status` for monitoring

### `live_streams` (Used by Twitch Webhook)
- Created when stream starts (`stream.online` event)
- Contains stream details from Twitch API
- Special fields for Twitch:
  - `livepeer_playback_id`: `twitch_{user_id}` (used to identify Twitch streams)
  - `livepeer_stream_id`: `twitch_{user_id}_{timestamp}` (unique stream ID)
  - `thumbnail_url`: Twitch thumbnail URL
  - `title`: Stream title from Twitch
  - `description`: Game/category from Twitch
  - `viewer_count`: Current viewers

## 🔐 Security Features

✅ **HMAC-SHA256 Signature Verification**: All webhook requests verified using client secret  
✅ **Row Level Security**: All database tables have RLS policies  
✅ **JWT Authentication**: OAuth endpoints require valid user sessions  
✅ **Service Role Access**: Functions use service role key for privileged operations  
✅ **Token Encryption**: Access tokens stored securely in database  

## 🔗 Important URLs

- **Webhook Endpoint**: `https://woucixqbnzmvlvnaaelb.supabase.co/functions/v1/twitch-webhook`
- **OAuth Endpoint**: `https://woucixqbnzmvlvnaaelb.supabase.co/functions/v1/twitch-oauth`
- **Twitch App Console**: https://dev.twitch.tv/console
- **Supabase Dashboard**: https://supabase.com/dashboard/project/woucixqbnzmvlvnaaelb

## 🎨 UI Features

### Stream Cards (Discover Page)
- 🟣 Purple Twitch badge on top-right corner
- 🔴 Red "LIVE" badge on top-left corner
- 👁️ Viewer count from Twitch
- 🖼️ Thumbnail from Twitch (1920x1080)

### Watch Page
- 📺 Full Twitch embed with player controls
- 💬 CrabbyTV chat (users can chat while watching)
- 💰 Tip buttons for creator
- ❤️ Reactions overlay
- 👤 Creator profile with follow button

## 🐛 Troubleshooting

### Issue: Webhook Not Receiving Events

**Checks:**
1. Verify secrets are set: `TWITCH_CLIENT_SECRET`, `TWITCH_CLIENT_ID`
2. Check subscription status in database:
```sql
SELECT * FROM twitch_eventsub_subscriptions WHERE user_id = auth.uid();
```
3. Check function logs for errors:
```bash
npx supabase functions logs twitch-webhook --project-ref woucixqbnzmvlvnaaelb
```

### Issue: Stream Not Appearing on Site

**Checks:**
1. Verify user has connected Twitch account
2. Check `live_streams` table for entry
3. Verify `is_live = true` and `livepeer_playback_id` starts with `twitch_`
4. Check webhook logs for errors

### Issue: Twitch Embed Not Showing

**Checks:**
1. Verify Twitch channel name is stored in `twitch_connections`
2. Check browser console for errors
3. Verify Twitch embed component is working (test with known channel)

### Issue: Subscriptions Not Created

**Checks:**
1. Verify `TWITCH_CLIENT_SECRET` is set correctly
2. Check OAuth function logs:
```bash
npx supabase functions logs twitch-oauth --project-ref woucixqbnzmvlvnaaelb
```
3. Verify access token has proper scopes

## 📈 Future Enhancements

Consider adding:
- ✨ Periodic viewer count updates (additional webhook subscription)
- ✨ Stream category/game display on cards
- ✨ Twitch chat integration (read Twitch chat in CrabbyTV)
- ✨ Multi-platform streaming (stream to both Twitch and CrabbyTV)
- ✨ Stream highlights and clips from Twitch
- ✨ Automatic token refresh when access tokens expire
- ✨ Admin dashboard for monitoring all subscriptions
- ✨ Analytics for Twitch vs native streams

## ✅ Success Criteria

After deployment, you should have:

- ✅ Users can connect their Twitch accounts via OAuth
- ✅ EventSub subscriptions automatically created on connect
- ✅ Streams automatically appear when users go live on Twitch
- ✅ Twitch streams are embedded and playable on CrabbyTV
- ✅ Twitch badge shows on stream cards
- ✅ Streams automatically end when users stop streaming
- ✅ Subscriptions cleaned up when users disconnect
- ✅ All webhook requests properly verified for security
- ✅ Full creator profile, tips, reactions, and chat available

## 🎉 Deployment Checklist

Use this checklist to ensure everything is deployed correctly:

- [ ] Database migration applied (`20251111000000_create_twitch_subscriptions.sql`)
- [ ] `TWITCH_CLIENT_ID` secret set in Supabase
- [ ] `TWITCH_CLIENT_SECRET` secret set in Supabase  
- [ ] `twitch-oauth` function deployed
- [ ] `twitch-webhook` function deployed
- [ ] Frontend changes deployed (Watch.tsx, LiveStreamCard.tsx, Discover.tsx)
- [ ] Test: Connect Twitch account works
- [ ] Test: Subscriptions created in database
- [ ] Test: Go live on Twitch → stream appears on CrabbyTV
- [ ] Test: Twitch badge shows on stream card
- [ ] Test: Watch page embeds Twitch stream correctly
- [ ] Test: End stream → disappears from Live Now
- [ ] Test: Disconnect → subscriptions deleted

---

**🎊 Congratulations!** Your Twitch Stream Webhook integration is complete. Users can now go live on Twitch and automatically have their streams appear on CrabbyTV with full embedding support!

For questions or issues, check the function logs or review the Twitch EventSub documentation:
- [Twitch EventSub Guide](https://dev.twitch.tv/docs/eventsub/)
- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
