# Livepeer Webhook Setup Guide

This guide explains how to set up webhooks to automatically save stream recordings to your Discover page.

## Overview

When you stream with recording enabled, Livepeer creates an asset (recording) once the stream ends. To automatically save these recordings to your database and display them on the Discover page, you need to configure a webhook.

## Steps to Configure Webhook

### 1. Deploy Your Webhook Endpoint

The webhook endpoint has been created at `/supabase/functions/livepeer-webhook/index.ts`. 

**For production:**
1. Deploy your Supabase functions:
   ```bash
   npx supabase functions deploy livepeer-webhook
   ```

2. Your webhook URL will be:
   ```
   https://[your-project-ref].supabase.co/functions/v1/livepeer-webhook
   ```

**For local development:**
1. Start Supabase locally:
   ```bash
   npx supabase start
   ```

2. Serve the function:
   ```bash
   npx supabase functions serve livepeer-webhook
   ```

3. Use ngrok or similar to expose your local endpoint:
   ```bash
   ngrok http 54321
   ```
   
4. Your webhook URL will be:
   ```
   https://[ngrok-url].ngrok.io/functions/v1/livepeer-webhook
   ```

### 2. Configure Webhook in Livepeer Studio

1. Log in to [Livepeer Studio](https://livepeer.studio)

2. Navigate to **Developers** > **Webhooks**

3. Click **Create Webhook**

4. Enter your webhook URL from Step 1

5. Select the following asset events:
   - ✅ `asset.created` - When a recording is created
   - ✅ `asset.updated` - When recording processing progresses
   - ✅ `asset.ready` - When recording is ready for playback
   - ✅ `asset.failed` - When recording processing fails
   - ✅ `asset.deleted` - When a recording is deleted

6. Click **Create Webhook**

### 3. Test Your Webhook

1. Start a live stream from your app

2. Stream for at least a few seconds

3. End the stream

4. Wait for Livepeer to process the recording (usually 1-5 minutes)

5. Check your Discover page - the recording should appear in the "Recordings" tab

## How It Works

1. **Stream Creation**: When you create a stream, it's created with `record: true`
   
2. **Recording Generation**: When you end the stream, Livepeer automatically creates an asset (recording)

3. **Webhook Notification**: Livepeer sends webhook events to your endpoint:
   - `asset.created` - Initial creation
   - `asset.updated` - Processing progress
   - `asset.ready` - Recording is ready to watch

4. **Database Storage**: The webhook endpoint saves the asset information to the `assets` table

5. **Display**: The Discover page fetches and displays recordings from the `assets` table

## Webhook Payload Structure

The webhook receives payloads like this:

```json
{
  "id": "webhook-id",
  "event": "asset.ready",
  "stream": {
    "id": "livepeer-stream-id"
  },
  "payload": {
    "id": "asset-id",
    "playbackId": "playback-id",
    "status": {
      "phase": "ready"
    },
    "name": "Stream recording",
    "videoSpec": {
      "duration": 120.5
    },
    "size": 1024000
  }
}
```

## Troubleshooting

### Recordings not appearing?

1. **Check webhook is configured**: Verify in Livepeer Studio dashboard
2. **Check webhook logs**: Look at Supabase function logs
3. **Verify stream has recording enabled**: Check `record: true` in stream creation
4. **Check database**: Query the `assets` table directly:
   ```sql
   SELECT * FROM assets ORDER BY created_at DESC;
   ```

### Webhook signature verification

For production, you should verify webhook signatures. The webhook already logs the signature header. To implement verification:

1. Get your webhook secret from Livepeer Studio
2. Add it to your environment variables
3. Update the webhook function to verify the signature

### Stream not linked to recording?

The webhook tries to link recordings to streams using the `stream.id` field in the webhook payload. If this fails:

1. The recording will still be saved, but without a `stream_id`
2. Check that the stream was created through your app (not manually in Livepeer)
3. Verify the `livepeer_stream_id` is saved correctly in your `live_streams` table

## Database Schema

### Assets Table

```sql
CREATE TABLE public.assets (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  stream_id UUID REFERENCES live_streams(id),
  title TEXT,
  description TEXT,
  thumbnail_url TEXT,
  livepeer_asset_id TEXT UNIQUE,
  livepeer_playback_id TEXT,
  status TEXT, -- 'processing', 'ready', 'failed'
  duration NUMERIC,
  size BIGINT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ
);
```

## Next Steps

- Set up webhook signature verification for security
- Add error notifications when webhook processing fails
- Implement automatic cleanup of old recordings
- Add ability to manually upload assets
