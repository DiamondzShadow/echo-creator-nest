# Pull Stream Guide - Re-stream from YouTube, TikTok, Twitch, etc.

## What is a Pull Stream?

A **Pull Stream** allows you to take a live stream from another platform (YouTube, Twitch, TikTok, Instagram, etc.) and re-broadcast it through Livepeer's decentralized infrastructure. This enables:

- ✅ Multi-platform streaming (stream to YouTube and your app simultaneously)
- ✅ Decentralized re-broadcasting
- ✅ Low-latency WebRTC playback for viewers
- ✅ Recording and archiving of external streams
- ✅ Custom branding and features on top of existing streams

## How It Works

```
Your Platform → Pull Stream → Livepeer → Your Viewers
(YouTube/Twitch)    (Ingest)   (Transcode)  (WebRTC/HLS)
```

## Setup Instructions

### 1. Deploy the Pull Stream Function

```bash
npx supabase functions deploy livepeer-pull-stream
```

### 2. Get Your Stream URL

#### YouTube Live

**Option 1: Public HLS URL (Easiest)**
```
https://www.youtube.com/watch?v=YOUR_VIDEO_ID
```
Or the direct HLS manifest:
```
https://www.youtube.com/api/manifest/dash/id/YOUR_VIDEO_ID/source/yt_live_broadcast
```

**Option 2: RTMP Ingest URL**
1. Go to YouTube Studio
2. Navigate to "Stream Settings"
3. Copy the Stream URL (rtmp://...)
4. Note: You'll be streaming TO YouTube, then pulling FROM YouTube

#### Twitch

**HLS URL** (while live):
```
https://usher.ttvnw.net/api/channel/hls/CHANNEL_NAME.m3u8
```

**RTMP URL**:
```
rtmp://live.twitch.tv/app/YOUR_STREAM_KEY
```

#### TikTok Live

TikTok provides RTMP ingest URLs when you go live via OBS:
```
rtmp://live-push.tiktokcdn.com/live/YOUR_STREAM_KEY
```

#### Instagram Live

Instagram is more restrictive, but you can use third-party tools to get RTMP URLs.

#### Generic RTMP/HLS

Any RTMP or HLS stream URL will work:
```
rtmp://server.com/live/streamkey
rtmps://server.com/live/streamkey
https://server.com/path/playlist.m3u8
```

### 3. Create a Pull Stream

#### Via UI

1. Go to the **Live** page
2. Click the **Pull Stream** tab
3. Enter your stream title and description
4. Paste your external stream URL (RTMP or HLS)
5. Click **Start Pull Stream**

The platform will:
- Create a Livepeer stream with pull configuration
- Start ingesting from your external source
- Transcode to multiple quality levels
- Make available for low-latency playback

#### Via API

```typescript
const { data, error } = await supabase.functions.invoke('livepeer-pull-stream', {
  body: { 
    action: 'create',
    pullUrl: 'rtmp://rtmp.youtube.com/live/YOUR_STREAM_KEY'
  }
});

// Response:
// {
//   streamId: "...",
//   streamKey: "...",
//   playbackId: "...",
//   pullUrl: "rtmp://..."
// }
```

## Use Cases

### 1. **Multi-Platform Streaming**

Stream to YouTube Live and your app simultaneously:

```
You → OBS → YouTube Live → Pull Stream → Livepeer → Your Viewers
                ↓
        YouTube Viewers
```

### 2. **Decentralized Re-broadcasting**

Take any RTMP stream and re-broadcast it through decentralized infrastructure:

```
External Source → Pull Stream → Livepeer Network → Global CDN
```

### 3. **Stream Aggregation**

Pull multiple streams and create a multi-view experience for your viewers.

### 4. **Archive External Streams**

Record and archive streams from other platforms with automatic transcoding.

## Important Notes

### Platform Terms of Service

⚠️ **Always check the platform's Terms of Service before re-streaming:**

- **YouTube**: Generally allows embedding and re-streaming of public live streams
- **Twitch**: Has restrictions on simultaneous streaming to other platforms (if you're affiliate/partner)
- **TikTok**: Check their developer terms
- **Instagram**: Has strict policies on third-party streaming

### Technical Limitations

1. **Latency**: Pull streams add ~5-10 seconds of latency compared to direct streaming
2. **Quality**: Limited by the source stream quality
3. **Reliability**: Depends on the source platform's uptime
4. **Bandwidth**: Livepeer will pull and transcode, which uses bandwidth

### Best Practices

1. **Use HLS when possible**: More reliable than RTMP for pulling
2. **Test first**: Test with a short stream before going live
3. **Monitor health**: Check the stream health in Livepeer Studio dashboard
4. **Have a backup**: Always have a direct streaming option as backup

## Troubleshooting

### "Failed to create pull stream"

**Causes:**
- Invalid URL format
- Source stream is not live
- Source requires authentication
- Network connectivity issues

**Solutions:**
- Verify the URL is accessible
- Ensure the source stream is actually live
- Check if the source requires special headers/auth

### "Stream is buffering"

**Causes:**
- Source stream has network issues
- Insufficient bandwidth
- Source stream quality too high

**Solutions:**
- Check source stream health
- Use a lower quality source
- Try a different source format (HLS vs RTMP)

### "No playback available"

**Causes:**
- Pull stream hasn't started yet
- Livepeer is still processing
- Source stream ended

**Solutions:**
- Wait 30-60 seconds for initialization
- Check if source stream is still live
- Verify stream status in Livepeer Studio

## Advanced Configuration

### Custom Headers (Authentication)

Some streams require authentication headers:

```typescript
const { data, error } = await supabase.functions.invoke('livepeer-pull-stream', {
  body: { 
    action: 'create',
    pullUrl: 'https://protected-stream.com/playlist.m3u8',
    pullUrlHeaders: {
      'Authorization': 'Bearer YOUR_TOKEN',
      'X-Custom-Header': 'value'
    }
  }
});
```

### Monitoring Pull Stream Status

```typescript
const { data, error } = await supabase.functions.invoke('livepeer-pull-stream', {
  body: { 
    action: 'get',
    streamId: 'YOUR_STREAM_ID'
  }
});

console.log(data.pull?.status); // "idle", "pulling", "error"
```

## API Reference

### Create Pull Stream

```typescript
POST /functions/v1/livepeer-pull-stream
{
  "action": "create",
  "pullUrl": "rtmp://... or https://...m3u8",
  "pullUrlHeaders": { /* optional */ }
}
```

### Get Pull Stream Info

```typescript
POST /functions/v1/livepeer-pull-stream
{
  "action": "get",
  "streamId": "YOUR_STREAM_ID"
}
```

### Delete Pull Stream

```typescript
POST /functions/v1/livepeer-pull-stream
{
  "action": "delete",
  "streamId": "YOUR_STREAM_ID"
}
```

## Resources

- [Livepeer API - Stream Object](https://docs.livepeer.org/api-reference/stream/create)
- [YouTube Live Streaming API](https://developers.google.com/youtube/v3/live)
- [Twitch API](https://dev.twitch.tv/docs/api/)
- [RTMP Specification](https://en.wikipedia.org/wiki/Real-Time_Messaging_Protocol)

## Support

If you encounter issues:
1. Check the Supabase Edge Function logs: `npx supabase functions logs livepeer-pull-stream`
2. Verify the stream in Livepeer Studio dashboard
3. Test the source URL independently first
4. Join Livepeer Discord: [discord.gg/livepeer](https://discord.gg/livepeer)
