# Testing Your Livestream Setup

## Quick Test Guide

### Prerequisites
Before testing, ensure:
1. Supabase is running locally or deployed
2. `LIVEPEER_API_KEY` is set in your Supabase environment variables
3. The new function `livepeer-playback` is deployed

### Deploy the New Playback Function

```bash
# If using Supabase CLI locally
supabase functions deploy livepeer-playback

# Set the API key if not already set
supabase secrets set LIVEPEER_API_KEY=your_livepeer_api_key
```

### Test Steps

#### 1. **Test Camera Preview**
1. Navigate to `/live` page
2. Click on "Instant Stream" tab
3. Click "Start Camera" button
4. **Expected:** Camera preview appears immediately with mirrored video
5. **Expected:** Audio level indicator shows when you speak

#### 2. **Test Live Broadcasting**
1. Fill in stream title and description
2. Keep camera running from step 1
3. Click "Go Live" button
4. **Expected:** 
   - "LIVE" badge appears in top-left
   - Stream starts broadcasting to Livepeer
   - You see "● LIVE" status

#### 3. **Test Playback (Low Latency)**
1. While streaming, open a new tab/browser
2. Go to `/discover` page
3. Find your stream in the list
4. Click to watch
5. **Expected:**
   - Video loads within 1-3 seconds (WebRTC)
   - Low latency - test by waving at camera and checking delay
   - Controls appear on hover (play/pause, volume, fullscreen)

#### 4. **Test Fallback to HLS**
If WebRTC fails (rare, due to firewall/network issues):
- Player should automatically switch to HLS
- Latency will be ~10 seconds instead of 1-3s
- Video should still play smoothly

#### 5. **Test Stream End**
1. Go back to streaming tab
2. Click "End Stream" button
3. **Expected:**
   - Stream stops
   - Preview disappears from Discover page
   - Recording is saved (if enabled)

## Troubleshooting

### Camera Preview Not Showing
**Symptom:** Black screen or "Camera preview will appear here"

**Check:**
- Browser permissions - allow camera/microphone access
- Check browser console for errors
- Ensure you're on HTTPS (required for getUserMedia)

### Stream Not Going Live
**Symptom:** "Go Live" button clicked but no LIVE badge appears

**Check:**
- Verify `LIVEPEER_API_KEY` is set correctly
- Check browser console for API errors
- Verify Supabase function `livepeer-stream` is deployed
- Check Network tab for failed requests

### Playback Not Loading
**Symptom:** Loading spinner forever or "Unable to load stream"

**Check:**
- Verify `livepeer-playback` function is deployed
- Check if stream is actually live (go to Livepeer dashboard)
- Browser console for errors
- Network tab for 500 errors from Supabase function

### High Latency (>5 seconds)
**Symptom:** Significant delay between camera and playback

**Possible Causes:**
- WebRTC not connecting (check for B-frames in stream)
- Falling back to HLS (normal, ~10s latency)
- Network issues (slow connection)

**Solutions:**
- For OBS users: Use Livepeer Studio preset (turns off B-frames)
- Check stream health in Livepeer dashboard
- Ensure keyframe interval is set to 2s

### No Audio
**Symptom:** Video works but no sound

**Check:**
- Microphone permissions granted
- Audio not muted in player controls
- Browser audio not muted
- Audio track enabled in InstantLiveStream component

## Advanced Testing

### Test with OBS (Professional Streaming)
1. Create stream via "Streaming Software" tab
2. Copy RTMP URL: `rtmp://rtmp.livepeer.com/live`
3. Copy Stream Key from the page
4. Configure OBS:
   - Settings → Stream
   - Service: "Livepeer Studio"
   - Stream Key: [paste your key]
5. Start streaming from OBS
6. Check playback in `/discover`

### Test Multistream (Future)
Once multistream is configured:
- Verify stream appears on all platforms
- Check health status for each target
- Monitor for disconnections

### Test Clipping (Future)
Once clipping is added:
- Create a clip during live stream
- Verify clip is saved as asset
- Check playback of clip

## Performance Metrics

### Expected Latencies:
- **WebRTC Broadcast + Playback:** 0.5-3 seconds
- **WebRTC Broadcast → HLS Playback:** 8-10 seconds  
- **RTMP Broadcast → WebRTC Playback:** 2-4 seconds
- **RTMP Broadcast → HLS Playback:** 10-15 seconds

### Stream Health Indicators:
- ✅ **Healthy:** All checks green, transcoding working
- ⚠️ **Warning:** Multistream targets offline (if configured)
- ❌ **Unhealthy:** Transcoding failed, check logs

## Debug Console Commands

### Check if stream is live:
```javascript
// In browser console on /live page
console.log('Is Live:', isLive);
console.log('Stream Key:', streamKey);
```

### Check playback sources:
```javascript
// In browser console on /watch page
// The player should log parsed sources
```

### Verify Broadcast status:
```javascript
// In browser console while streaming
// Check for Broadcast.Root status logs
```

## Success Criteria

Your setup is working correctly if:
- ✅ Camera preview loads immediately
- ✅ "Go Live" starts broadcasting within 2 seconds
- ✅ Playback has <3 second latency (WebRTC)
- ✅ Stream appears in Discover page while live
- ✅ Audio and video both work
- ✅ Controls (mute, fullscreen) work properly
- ✅ Stream ends cleanly without errors

## Getting Help

If you encounter issues:
1. Check browser console for errors
2. Check Supabase function logs
3. Check Livepeer dashboard stream health
4. Review `STREAMING_IMPROVEMENTS.md` for architecture
5. Verify all Supabase functions are deployed
6. Ensure environment variables are set correctly
