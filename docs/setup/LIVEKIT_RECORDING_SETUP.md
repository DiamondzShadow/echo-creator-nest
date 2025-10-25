# LiveKit Recording to Storj Setup

This guide explains how to set up automatic recording of LiveKit instant streams directly to Storj decentralized storage.

## Architecture Overview

```
┌─────────────────┐
│  User Streams   │
│  (LiveKit)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  LiveKit Cloud  │
│  Records Room   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Storj Bucket   │
│  (S3 Compatible)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  LiveKit        │
│  Webhook        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Assets Table   │
│  (Database)     │
└─────────────────┘
```

## What's Implemented

### 1. Edge Functions

#### `livekit-egress` - Start Recording
Starts LiveKit Egress to record rooms directly to Storj.

**Endpoint:** `https://[project].supabase.co/functions/v1/livekit-egress`

**Usage:**
```typescript
const { data, error } = await supabase.functions.invoke('livekit-egress', {
  body: {
    roomName: 'stream-123',
    streamId: 'uuid',
  }
});
```

#### `livekit-webhook` - Handle Events
Processes LiveKit webhooks for:
- Room started/finished
- Recording started/completed/failed
- Participant joined/left (viewer count)

**Endpoint:** `https://[project].supabase.co/functions/v1/livekit-webhook`

### 2. Database Integration

Recordings are automatically saved to the `assets` table when completed:
- Links to original stream
- Stores file location in Storj
- Tracks duration and file size
- Shows in Discover > Recordings tab

### 3. UI Integration

- ✅ Recording toggle on Live page
- ✅ "Save to Storj" option
- ✅ Settings passed to LiveKit token creation
- ✅ "Save to Storj" button on recording cards

## Setup Instructions

### 1. Configure LiveKit Cloud Webhook

1. Go to [LiveKit Cloud Dashboard](https://cloud.livekit.io)
2. Select your project: `diamondzchain-ep9nznbn`
3. Navigate to **Settings** > **Webhooks**
4. Click **Add Webhook**
5. Enter webhook URL:
   ```
   https://[your-project-ref].supabase.co/functions/v1/livekit-webhook
   ```
6. Select these events:
   - ✅ `room_started`
   - ✅ `room_finished`
   - ✅ `egress_started`
   - ✅ `egress_ended`
   - ✅ `egress_failed`
   - ✅ `participant_joined`
   - ✅ `participant_left`
7. Click **Create**

### 2. Verify Credentials

Ensure these secrets are configured (already done):
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- `STORJ_ACCESS_KEY_ID`
- `STORJ_SECRET_ACCESS_KEY`
- `STORJ_BUCKET`
- `STORJ_ENDPOINT`

### 3. Test the Setup

1. **Start a Stream:**
   - Go to `/live`
   - Enable "Record Stream"
   - Enable "Save to Storj"
   - Click "Go Live Now"

2. **Stream for 1-2 minutes**
   - Speak, move around
   - Check that the stream is visible

3. **End the Stream**
   - Click "End Stream"

4. **Wait for Processing**
   - LiveKit takes 1-3 minutes to process recordings
   - Check edge function logs:
     ```bash
     supabase functions logs livekit-webhook
     ```

5. **View Recording**
   - Go to `/discover`
   - Click "Recordings" tab
   - Your recording should appear!
   - Click "Save to Storj" if needed for additional backup

## How It Works

### Recording Flow

1. **User starts stream** with recording enabled
2. **Token created** with recording metadata
3. **Recording starts automatically** via LiveKit Egress
4. **Saved directly to Storj** during recording
5. **Webhook fired** when recording completes
6. **Asset created** in database
7. **Shows in Recordings** tab

### File Storage

Recordings are stored in Storj at:
```
storj://[bucket]/livekit-recordings/[user-id]/[room-name]_[timestamp].mp4
```

Example:
```
storj://livepeer-videos/livekit-recordings/uuid-123/stream-456_1234567890.mp4
```

## Monitoring & Debugging

### Check Webhook Logs

```bash
# View LiveKit webhook logs
supabase functions logs livekit-webhook

# View egress function logs
supabase functions logs livekit-egress
```

### Check LiveKit Dashboard

1. Go to [LiveKit Cloud](https://cloud.livekit.io)
2. Navigate to **Egress** section
3. View active and completed recordings
4. Check for errors

### Check Database

```sql
-- View recent recordings
SELECT * FROM assets 
WHERE livepeer_asset_id LIKE 'EG_%' 
ORDER BY created_at DESC 
LIMIT 10;

-- View streams with recording enabled
SELECT * FROM live_streams 
WHERE description LIKE '%Recording%'
ORDER BY created_at DESC;
```

### Common Issues

#### Recording not starting

**Symptoms:** Stream works but no recording appears

**Solutions:**
1. Check LiveKit Egress logs in dashboard
2. Verify Storj credentials are correct
3. Check edge function logs for errors
4. Ensure webhook is configured

#### Recording file not found

**Symptoms:** Asset created but video not playable

**Solutions:**
1. Check Storj bucket contents
2. Verify file path in database
3. Check if egress completed successfully
4. Look for errors in webhook logs

#### Webhook not firing

**Symptoms:** Recording completes but not in database

**Solutions:**
1. Verify webhook URL is correct
2. Check webhook secret is not set (or matches)
3. Test webhook endpoint manually
4. Check Supabase edge function logs

## API Reference

### Start Egress

**POST** `livekit-egress`

```typescript
{
  roomName: string;     // LiveKit room name
  streamId?: string;    // Optional stream ID for tracking
}
```

**Response:**
```typescript
{
  success: boolean;
  egressId: string;
  filename: string;
  message: string;
}
```

### Webhook Events

**POST** `livekit-webhook`

LiveKit sends these event types:
- `room_started` - Room becomes active
- `room_finished` - Room closes
- `egress_started` - Recording begins
- `egress_ended` - Recording completes (creates asset)
- `egress_failed` - Recording error
- `participant_joined` - Viewer joins
- `participant_left` - Viewer leaves

## Costs

### LiveKit Cloud
- **Recording:** ~$0.007/minute for HD recording
- **Egress:** Included with recording
- **Storage:** Free in Storj

### Storj
- **Storage:** $4/TB/month
- **Download:** $7/TB
- **Free tier:** 150GB storage + 150GB download/month

### Estimate for 100 hours/month
- LiveKit: ~$42/month (recording)
- Storj: Free (within free tier)
- **Total: ~$42/month**

## Next Steps

### Optional Enhancements

1. **Auto-delete old recordings**
   - Set up scheduled function
   - Delete recordings older than X days
   - Free up Storj storage

2. **Thumbnail generation**
   - Extract thumbnail from recording
   - Store in Supabase Storage
   - Display in Recordings tab

3. **Download button**
   - Generate Storj download URL
   - Add download button to recordings
   - Track downloads

4. **Recording quality options**
   - Add quality selector in UI
   - Pass to egress (720p, 1080p, 4K)
   - Adjust pricing estimates

5. **Live recording indicator**
   - Show "Recording" badge on stream
   - Display estimated file size
   - Show recording duration

## Resources

- [LiveKit Egress Docs](https://docs.livekit.io/home/egress/overview/)
- [LiveKit Webhooks](https://docs.livekit.io/home/server/webhooks/)
- [Storj S3 API](https://docs.storj.io/dcs/api-reference/s3-compatible-gateway)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

---

**Your LiveKit recording to Storj is ready! Just configure the webhook in LiveKit Cloud and start streaming! 🎉**
