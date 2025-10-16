# Stream Recordings Setup - Complete ✅

## What Was Fixed

Your stream recordings are now set up to be saved automatically! Previously, streams would work but recordings weren't being saved to the Discover page. Here's what was implemented:

## Changes Made

### 1. Database Schema
- ✅ Created new `assets` table to store stream recordings
- ✅ Added fields for Livepeer asset information, status, duration, thumbnails
- ✅ Linked assets to original streams and user profiles
- ✅ Set up proper indexes and RLS policies

**Migration file**: `/supabase/migrations/20251016162003_create_assets_table.sql`

### 2. Webhook Endpoint
- ✅ Created `/supabase/functions/livepeer-webhook/index.ts`
- ✅ Handles all asset events: `created`, `updated`, `ready`, `failed`, `deleted`
- ✅ Automatically links recordings to original streams
- ✅ Extracts thumbnails from Livepeer playback info
- ✅ Updates asset status as processing completes

### 3. UI Updates

#### Discover Page (`/src/pages/Discover.tsx`)
- ✅ Added new "Recordings" tab
- ✅ Fetches assets from the database
- ✅ Real-time updates when new recordings are ready
- ✅ Shows recording count in tab label

#### Live Stream Card (`/src/components/LiveStreamCard.tsx`)
- ✅ Updated to display both streams and recordings
- ✅ Shows thumbnail for recordings (if available)
- ✅ Displays duration for recordings
- ✅ Shows viewer count for live streams

#### Watch Page (`/src/pages/Watch.tsx`)
- ✅ Updated to play both live streams and recordings
- ✅ Automatically checks both `live_streams` and `assets` tables
- ✅ Same player works for both types

## How It Works

```
┌─────────────┐
│ User Streams│
│ (record=true)│
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ Stream Ends     │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ Livepeer Creates│
│ Recording Asset │
└──────┬──────────┘
       │
       ▼
┌─────────────────────┐
│ Webhook Triggered   │
│ asset.created       │
│ asset.updated       │
│ asset.ready         │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Saved to Database   │
│ assets table        │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Shown on Discover   │
│ "Recordings" tab    │
└─────────────────────┘
```

## Setup Required

### 1. Apply Database Migration

The migration will be applied automatically when you deploy. For local development:

```bash
npx supabase db reset
```

### 2. Deploy Webhook Function

**Production:**
```bash
npx supabase functions deploy livepeer-webhook
```

Your webhook URL: `https://[your-project-ref].supabase.co/functions/v1/livepeer-webhook`

**Local Development:**
```bash
# Start Supabase
npx supabase start

# Serve the function
npx supabase functions serve livepeer-webhook

# Expose with ngrok (in another terminal)
ngrok http 54321
```

Your webhook URL: `https://[ngrok-url].ngrok.io/functions/v1/livepeer-webhook`

### 3. Configure Livepeer Webhook

1. Go to [Livepeer Studio](https://livepeer.studio/dashboard/developers/webhooks)
2. Click "Create Webhook"
3. Enter your webhook URL
4. Select these events:
   - ✅ asset.created
   - ✅ asset.updated
   - ✅ asset.ready
   - ✅ asset.failed
   - ✅ asset.deleted
5. Click "Create"

See detailed instructions in `WEBHOOK_SETUP.md`

### 4. Update TypeScript Types (Optional)

To get TypeScript types for the new `assets` table:

```bash
npx supabase gen types typescript --local > src/integrations/supabase/types.ts
```

## Testing

1. **Start a Stream**
   - Go to `/live`
   - Create a stream
   - Stream for at least 30 seconds

2. **End the Stream**
   - Click "End Stream"

3. **Wait for Processing**
   - Livepeer takes 1-5 minutes to process recordings
   - Check webhook logs in Supabase dashboard

4. **View Recording**
   - Go to `/discover`
   - Click "Recordings" tab
   - Your recording should appear there!

## Verification Checklist

- [ ] Database migration applied (check `assets` table exists)
- [ ] Webhook function deployed
- [ ] Webhook configured in Livepeer Studio
- [ ] Test stream created and ended
- [ ] Recording appears in Recordings tab

## Troubleshooting

### Recording not appearing?

1. **Check webhook logs**: Supabase Dashboard > Edge Functions > livepeer-webhook
2. **Check Livepeer**: Studio Dashboard > Assets (recording should be there)
3. **Check database**: 
   ```sql
   SELECT * FROM assets ORDER BY created_at DESC LIMIT 5;
   ```
4. **Verify webhook**: Livepeer Dashboard > Webhooks (check delivery status)

### No thumbnail?

- Thumbnails are generated by Livepeer after processing
- They appear when `asset.ready` event is received
- Check the asset has `meta.source` with Thumbnails type

### Stream not linked to recording?

- Check `livepeer_stream_id` is saved in `live_streams` table
- Webhook uses this to link recording to original stream
- Recording will still save, just without the link

## What's New on Discover Page

The Discover page now has 3 tabs:

1. **Live Now** - Active streams (unchanged)
2. **Recordings** - NEW! Saved stream recordings
3. **All Streams** - All streams including ended ones

Recordings show:
- Thumbnail (auto-generated)
- Duration
- Creator info
- Recording title

## Files Modified

- ✅ `/supabase/migrations/20251016162003_create_assets_table.sql`
- ✅ `/supabase/functions/livepeer-webhook/index.ts`
- ✅ `/src/pages/Discover.tsx`
- ✅ `/src/components/LiveStreamCard.tsx`
- ✅ `/src/pages/Watch.tsx`

## Next Steps

Optional enhancements:
- Add download button for recordings
- Show processing progress
- Add manual upload for pre-recorded videos
- Implement recording deletion
- Add recording clips/highlights
- Set up automatic cleanup of old recordings

---

**Your stream recordings are now fully set up! Just configure the webhook in Livepeer Studio and you're good to go! 🎉**
