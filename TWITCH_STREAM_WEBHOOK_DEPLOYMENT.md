# Twitch Stream Webhook - Deployment Guide

## ✅ What Was Implemented

The Twitch Stream Webhook system has been fully implemented with the following components:

### 1. **Database Migration** ✓
- Created `twitch_eventsub_subscriptions` table to track webhook subscriptions
- Stores subscription IDs, types (stream.online/stream.offline), and status
- Includes RLS policies for security

### 2. **Updated Edge Functions** ✓

#### `twitch-oauth` Function
- **Automatic Subscription Creation**: When users connect their Twitch account, the system now automatically creates EventSub subscriptions for `stream.online` and `stream.offline` events
- **Subscription Management**: When users disconnect, all subscriptions are properly deleted from both Twitch and the database
- **Helper Functions**: Added `createEventSubSubscription()` and `deleteEventSubSubscription()` for managing Twitch EventSub API

#### `twitch-webhook` Function (Already Existed)
- Receives webhook notifications from Twitch
- Verifies signatures using HMAC-SHA256
- Creates entries in `live_streams` table when streams start
- Updates entries when streams end
- Handles webhook verification challenges

### 3. **Configuration Updates** ✓
- Both functions properly configured in `supabase/config.toml`
- `twitch-webhook` has `verify_jwt = false` (public endpoint for Twitch)
- `twitch-oauth` has `verify_jwt = true` (requires user authentication)

## 🚀 Deployment Steps

### Step 1: Set Required Environment Variables

You need to add these secrets to your Supabase project:

```bash
# Via Supabase Dashboard:
# Go to: https://supabase.com/dashboard/project/woucixqbnzmvlvnaaelb/settings/functions

# Add these secrets:
TWITCH_CLIENT_ID=hdm6ufl160ptki0gbht94s57515oyj
TWITCH_CLIENT_SECRET=fitqshriphdq13pamofhyxnq79534m
```

**Method 1: Via Supabase Dashboard (Recommended)**
1. Go to your Supabase project settings
2. Navigate to **Edge Functions** → **Secrets**
3. Add each secret:
   - Name: `TWITCH_CLIENT_ID`, Value: `hdm6ufl160ptki0gbht94s57515oyj`
   - Name: `TWITCH_CLIENT_SECRET`, Value: `fitqshriphdq13pamofhyxnq79534m`

**Method 2: Via Supabase CLI**
```bash
npx supabase secrets set TWITCH_CLIENT_ID=hdm6ufl160ptki0gbht94s57515oyj
npx supabase secrets set TWITCH_CLIENT_SECRET=fitqshriphdq13pamofhyxnq79534m
```

### Step 2: Run Database Migration

Apply the new migration to create the `twitch_eventsub_subscriptions` table:

```bash
# If using Supabase CLI locally
npx supabase db push

# Or apply directly via Supabase Dashboard
# Go to SQL Editor and run the migration file:
# supabase/migrations/20251111000000_create_twitch_subscriptions.sql
```

### Step 3: Deploy Edge Functions

Deploy both updated edge functions:

```bash
# Deploy twitch-oauth function
npx supabase functions deploy twitch-oauth --project-ref woucixqbnzmvlvnaaelb

# Deploy twitch-webhook function (if needed)
npx supabase functions deploy twitch-webhook --project-ref woucixqbnzmvlvnaaelb
```

### Step 4: Verify Deployment

Check that the functions are deployed correctly:

```bash
# Check function logs
npx supabase functions logs twitch-oauth --project-ref woucixqbnzmvlvnaaelb
npx supabase functions logs twitch-webhook --project-ref woucixqbnzmvlvnaaelb
```

## 🧪 Testing the Setup

### Test 1: Connect Twitch Account

1. Log in to your CrabbyTV account
2. Navigate to Settings or Live page
3. Click "Connect Twitch"
4. Authorize the application on Twitch
5. Check the logs to see subscription creation:

```bash
npx supabase functions logs twitch-oauth --project-ref woucixqbnzmvlvnaaelb
```

You should see:
```
Connection saved successfully
Creating EventSub subscriptions...
Created stream.online subscription: [subscription-id]
Created stream.offline subscription: [subscription-id]
```

### Test 2: Verify Database Entries

Run this query in Supabase SQL Editor:

```sql
-- Check Twitch connection
SELECT * FROM twitch_connections WHERE user_id = auth.uid();

-- Check EventSub subscriptions
SELECT * FROM twitch_eventsub_subscriptions WHERE user_id = auth.uid();
```

You should see:
- One entry in `twitch_connections` with your Twitch credentials
- Two entries in `twitch_eventsub_subscriptions` (stream.online and stream.offline)

### Test 3: Test Stream Start Event

1. Start a stream on Twitch
2. Wait up to 60 seconds for webhook notification
3. Check webhook logs:

```bash
npx supabase functions logs twitch-webhook --project-ref woucixqbnzmvlvnaaelb
```

You should see:
```
Received webhook: { messageType: 'notification', messageId: '...' }
Event type: stream.online
Found user: { user_id: '...', twitch_username: '...' }
Created live stream: { ... }
```

4. Check `live_streams` table:

```sql
SELECT * FROM live_streams WHERE user_id = auth.uid() ORDER BY created_at DESC LIMIT 1;
```

You should see a new entry with `is_live = true` and stream details from Twitch.

### Test 4: Test Stream End Event

1. Stop your Twitch stream
2. Wait up to 60 seconds for webhook notification
3. Check webhook logs (same command as above)

You should see:
```
Event type: stream.offline
Stream ended
```

4. Verify the stream entry is updated:

```sql
SELECT * FROM live_streams WHERE user_id = auth.uid() ORDER BY created_at DESC LIMIT 1;
```

The entry should now have `is_live = false` and an `ended_at` timestamp.

### Test 5: Test Disconnect

1. Disconnect your Twitch account from settings
2. Check logs to verify subscription cleanup:

```bash
npx supabase functions logs twitch-oauth --project-ref woucixqbnzmvlvnaaelb
```

3. Verify database cleanup:

```sql
-- Should return no rows
SELECT * FROM twitch_connections WHERE user_id = auth.uid();
SELECT * FROM twitch_eventsub_subscriptions WHERE user_id = auth.uid();
```

## 📊 How It Works

### Flow Diagram

```
User Connects Twitch Account
    ↓
twitch-oauth function
    ↓
1. Exchange OAuth code for access token
2. Get Twitch user info
3. Save to twitch_connections table
4. Create EventSub subscriptions (stream.online, stream.offline)
5. Save subscription IDs to twitch_eventsub_subscriptions table
    ↓
User goes live on Twitch
    ↓
Twitch sends webhook notification
    ↓
twitch-webhook function
    ↓
1. Verify signature (security)
2. Find user via twitch_user_id
3. Fetch stream details from Twitch API
4. Create entry in live_streams table
    ↓
Stream appears on CrabbyTV!
```

### Database Tables

#### `twitch_connections`
- Stores OAuth credentials for each user
- Links CrabbyTV user_id to Twitch user_id
- Stores access_token for API calls

#### `twitch_eventsub_subscriptions`
- Tracks active EventSub subscriptions
- One row per subscription type (online/offline)
- Stores subscription_id for deletion

#### `live_streams`
- Created when stream starts
- Contains stream title, thumbnail, viewer count
- Updated when stream ends (`is_live = false`)

## 🔒 Security Features

1. **Signature Verification**: All webhook requests are verified using HMAC-SHA256
2. **Row Level Security**: Database tables have RLS policies
3. **JWT Authentication**: OAuth endpoint requires valid user session
4. **Service Role**: Functions use service role key for database operations

## 🐛 Troubleshooting

### Issue: "TWITCH_CLIENT_SECRET not configured"

**Solution**: Add the secret to Supabase (see Step 1)

### Issue: "Failed to create subscription"

**Possible causes**:
- Invalid access token
- Webhook URL not publicly accessible
- Already have max subscriptions for this user

**Solution**: Check function logs for detailed error message

### Issue: "Webhook not receiving events"

**Checks**:
1. Verify subscriptions exist in database
2. Check subscription status in Twitch Dev Console
3. Ensure webhook URL is correct and publicly accessible
4. Verify signature validation is working

**Debug commands**:
```bash
# Check function logs
npx supabase functions logs twitch-webhook --project-ref woucixqbnzmvlvnaaelb

# Check subscriptions
curl -X GET 'https://api.twitch.tv/helix/eventsub/subscriptions' \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Client-ID: hdm6ufl160ptki0gbht94s57515oyj"
```

### Issue: "Stream not appearing in CrabbyTV"

**Checks**:
1. User has connected Twitch account
2. EventSub subscriptions exist and are active
3. Stream is actually live on Twitch
4. Webhook received the notification (check logs)
5. No errors in stream creation (check logs)

## 🎉 Success Criteria

After successful deployment, you should have:

✅ Users can connect their Twitch accounts  
✅ EventSub subscriptions are automatically created  
✅ Streams automatically appear when users go live on Twitch  
✅ Streams automatically end when users stop streaming  
✅ Subscriptions are cleaned up when users disconnect  
✅ All webhook requests are properly verified for security  

## 📝 Future Enhancements

Consider adding:
- Periodic viewer count updates (create additional webhook for stream updates)
- Subscription refresh logic for expired subscriptions
- Admin dashboard to view all active subscriptions
- Metrics tracking for webhook performance
- Automatic token refresh when access tokens expire

## 🔗 Webhook Endpoint

Your public webhook endpoint is:
```
https://woucixqbnzmvlvnaaelb.supabase.co/functions/v1/twitch-webhook
```

This URL is configured to receive EventSub notifications from Twitch.

---

**Need Help?** Check the function logs or review the Twitch EventSub documentation:
- [Twitch EventSub Guide](https://dev.twitch.tv/docs/eventsub/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
