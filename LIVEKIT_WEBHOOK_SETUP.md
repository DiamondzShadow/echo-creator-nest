# LiveKit Webhook Configuration

This guide explains how to configure the LiveKit webhook to enable proper viewer counting and stream management.

## Why Webhooks Are Important

The LiveKit webhook notifies your backend about important events:
- When participants join/leave (for viewer counts)
- When rooms start/finish (for stream status)
- When recordings complete (for VOD creation)

**Without the webhook configured, you'll experience:**
- ❌ Viewer count always showing 0
- ❌ Streams not automatically ending when broadcaster stops
- ❌ Multiple viewers having connection issues

## Setup Steps

### 1. Get Your Webhook URL

Your webhook URL is:
```
https://woucixqbnzmvlvnaaelb.supabase.co/functions/v1/livekit-webhook
```

### 2. Configure in LiveKit Dashboard

1. Go to your LiveKit Cloud dashboard: https://cloud.livekit.io
2. Navigate to **Settings** → **Webhooks**
3. Click **Add Webhook**
4. Enter your webhook URL (from step 1)
5. Select these events:
   - ✅ `room_started`
   - ✅ `room_finished`
   - ✅ `participant_joined`
   - ✅ `participant_left`
   - ✅ `egress_started` (for recordings)
   - ✅ `egress_ended` (for recordings)
6. Click **Save**

### 3. Verify Configuration

After saving, you can test by:
1. Starting a live stream
2. Joining as a viewer in another browser/device
3. Check the backend logs to see webhook events being received

## What Each Event Does

### room_started
- Marks stream as live in database
- Sets the `started_at` timestamp

### room_finished
- Marks stream as ended
- Sets `ended_at` timestamp
- Resets viewer count to 0

### participant_joined / participant_left
- Updates the `viewer_count` in real-time
- Subtracts 1 from total (to exclude broadcaster)

### egress_ended
- Creates a video asset from the recording
- Uploads to Livepeer with IPFS
- Makes recording available for playback

## Troubleshooting

### Viewer count still at 0?
1. Check LiveKit dashboard logs for webhook delivery
2. Ensure webhook URL is correct
3. Check Supabase Edge Function logs for errors

### Old streams still showing as live?
1. Webhook might not be receiving `room_finished` events
2. Check that the webhook has the correct events selected
3. Manually end streams using the "Force End" button

### Multiple viewers can't connect?
1. Check browser console for LiveKit connection errors
2. Ensure LIVEKIT_URL environment variable is correct
3. Try refreshing the viewer page after stream is fully live

## Security Note

The webhook uses JWT authentication. Your LiveKit API Secret is used to verify webhook authenticity, ensuring only LiveKit can send events to your backend.
