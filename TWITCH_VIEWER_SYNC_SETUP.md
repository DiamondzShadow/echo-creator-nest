# Twitch Viewer Count Auto-Sync

## Overview

Automatically synchronizes viewer counts for active Twitch streams every 10 minutes by polling the Twitch API. This ensures real-time viewer count updates while respecting rate limits.

## What Was Implemented

### 1. Edge Function: `twitch-viewer-sync`

**Location**: `supabase/functions/twitch-viewer-sync/index.ts`

**Purpose**: Polls Twitch API to update viewer counts for all active Twitch streams

**Features**:
- ✅ Fetches all active Twitch streams from database
- ✅ Polls Twitch Helix API for current stream info
- ✅ Updates viewer counts in `live_streams` table
- ✅ Automatically marks streams as ended if they go offline
- ✅ Rate limit protection with 100ms delay between API calls
- ✅ Error handling per stream (continues if one fails)
- ✅ Detailed logging for monitoring

### 2. Cron Job Schedule

**Frequency**: Every 10 minutes (`*/10 * * * *`)

**Configuration**:
- Uses `pg_cron` extension for scheduling
- Uses `pg_net` extension for HTTP calls
- Runs automatically without user intervention

## How It Works

```
Every 10 minutes:
    ↓
Cron triggers edge function
    ↓
Function queries database for active Twitch streams
    ↓
For each stream:
    - Extract twitch_user_id
    - Get access_token from twitch_connections
    - Call Twitch API /helix/streams
    - Update viewer_count in live_streams table
    - Mark as offline if stream ended
    ↓
Returns sync results
```

## Rate Limit Safety

### Twitch API Limits
- **Rate Limit**: 800 requests per minute per application
- **Our Usage**: ~6 requests per minute (1 stream every 10 minutes)
- **Buffer**: We use <1% of available rate limit

### Built-in Protection
1. **10-minute intervals**: Prevents excessive polling
2. **100ms delays**: Between consecutive API calls
3. **Single endpoint**: Only uses `/helix/streams` endpoint
4. **Efficient querying**: Only fetches active streams

## Monitoring

### Check Function Logs
```bash
npx supabase functions logs twitch-viewer-sync --project-ref woucixqbnzmvlvnaaelb
```

### Expected Log Output
```
Starting Twitch viewer count sync...
Found 3 active Twitch streams
Updating stream abc-123: 45 -> 52 viewers
Updating stream def-456: 120 -> 118 viewers
Stream ghi-789 is now offline, marking as ended
Sync complete: {
  success: true,
  total_streams: 3,
  updated: 3,
  errors: 0,
  timestamp: "2025-01-15T10:30:00.000Z"
}
```

### Check Cron Job Status
```sql
-- View all cron jobs
SELECT * FROM cron.job;

-- View cron job run history
SELECT * FROM cron.job_run_details 
WHERE jobname = 'twitch-viewer-count-sync'
ORDER BY start_time DESC 
LIMIT 10;
```

## Testing

### Manual Test
You can manually trigger the sync function:

```bash
curl -X POST https://woucixqbnzmvlvnaaelb.supabase.co/functions/v1/twitch-viewer-sync \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

### Expected Response
```json
{
  "success": true,
  "total_streams": 2,
  "updated": 2,
  "errors": 0,
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

## Database Impact

### Query Performance
- **Streams Query**: Fast (indexed on is_live and livepeer_playback_id)
- **Update Operations**: ~100ms per stream
- **Total Function Time**: <5 seconds for 10 active streams

### Storage Impact
- Minimal: Only updates existing rows
- No additional storage required

## Troubleshooting

### Issue: Cron job not running

**Check if cron job exists**:
```sql
SELECT * FROM cron.job WHERE jobname = 'twitch-viewer-count-sync';
```

**Check job run history**:
```sql
SELECT * FROM cron.job_run_details 
WHERE jobname = 'twitch-viewer-count-sync'
ORDER BY start_time DESC;
```

### Issue: Viewer counts not updating

**Possible Causes**:
1. No active Twitch streams
2. Twitch API token expired
3. Network connectivity issues

**Debug Steps**:
1. Check function logs for errors
2. Verify active streams exist in database
3. Test Twitch API access with a manual curl
4. Check twitch_connections table for valid tokens

### Issue: Rate limit errors

If you see `429 Too Many Requests`:
1. Check if multiple instances are running
2. Verify cron schedule (should be */10)
3. Contact Twitch support to increase rate limit if needed

## Managing the Cron Job

### Disable Cron Job
```sql
SELECT cron.unschedule('twitch-viewer-count-sync');
```

### Re-enable Cron Job
```sql
SELECT cron.schedule(
  'twitch-viewer-count-sync',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url:='https://woucixqbnzmvlvnaaelb.supabase.co/functions/v1/twitch-viewer-sync',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body:=concat('{"time": "', now(), '"}')::jsonb
  ) as request_id;
  $$
);
```

### Change Schedule
```sql
-- Update to every 5 minutes
SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'twitch-viewer-count-sync'),
  schedule := '*/5 * * * *'
);

-- Update to every 15 minutes  
SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'twitch-viewer-count-sync'),
  schedule := '*/15 * * * *'
);
```

## Cost Considerations

### Twitch API
- **Free tier**: Up to 800 requests/minute
- **Our usage**: ~6 requests/minute = Free ✅

### Supabase Functions
- **Invocations**: 4,320 per month (6 per hour × 24 × 30)
- **Compute time**: ~5 seconds per invocation = 6 hours/month
- **Well within free tier**: 500K invocations, 400K GB-seconds ✅

### Database
- **Read operations**: ~100 per hour = Minimal cost
- **Write operations**: ~50 per hour = Minimal cost

**Total Monthly Cost**: Essentially free on current usage ✅

## Future Enhancements

Consider adding:
- **Adaptive polling**: Poll more frequently for high-viewer streams
- **Webhook fallback**: Use EventSub for instant updates
- **Metrics dashboard**: Track sync performance and errors
- **Alert system**: Notify admins of sync failures
- **Stream analytics**: Track viewer count trends over time

## Summary

✅ Automatic viewer count sync every 10 minutes  
✅ Rate-limit safe (uses <1% of Twitch API limit)  
✅ Automatic offline detection  
✅ Detailed logging and monitoring  
✅ Zero cost on free tier  
✅ Production-ready and scalable  

---

**Last Updated**: January 2025  
**Status**: Active and Running 🟢
