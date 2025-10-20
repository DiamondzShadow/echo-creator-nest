# Livepeer Streaming Troubleshooting Guide

## Common Issues and Solutions

### 1. 🔴 "Stream Contains B-frames" Error

**Problem:** WebRTC playback fails with B-frames error, forcing HLS fallback (5-10s delay).

**Root Cause:** B-frames (bidirectional predicted frames) are not supported by WebRTC. They're part of H.264 Main/High profiles.

**Solutions:**

#### For Browser Broadcasting (WebRTC):
- ✅ Already fixed - browser broadcast uses H.264 Baseline profile (no B-frames)
- The LivepeerBroadcast component is configured correctly

#### For OBS/Streaming Software:
1. **OBS Settings:**
   ```
   Settings → Output → Streaming
   - Encoder: x264 or NVIDIA NVENC H.264
   - Profile: baseline (CRITICAL!)
   - Preset: veryfast or faster
   - Keyframe Interval: 2
   - B-frames: 0 (if option exists)
   ```

2. **Advanced Encoder Settings (x264):**
   ```
   x264 Options: bframes=0 profile=baseline level=3.1
   ```

3. **NVIDIA NVENC Settings:**
   ```
   Profile: Baseline
   Preset: Low-Latency or Low-Latency Performance
   Look-ahead: OFF
   Psycho Visual Tuning: OFF
   ```

#### For FFmpeg Users:
```bash
ffmpeg -i input.mp4 -c:v libx264 \
  -profile:v baseline \
  -level 3.1 \
  -x264opts "bframes=0:cabac=0:ref=1" \
  -g 60 \
  -keyint_min 60 \
  -sc_threshold 0 \
  -c:a aac -b:a 128k \
  -f flv rtmp://rtmp.livepeer.com/live/YOUR_STREAM_KEY
```

### 2. 🚫 "WebRTC Connection Failed"

**Problem:** Stream fails to connect via WebRTC, falls back to HLS.

**Common Causes & Solutions:**

#### A. Firewall/Network Issues
- **Check:** Corporate firewall or VPN blocking WebRTC
- **Solution:** 
  - Try on a different network (mobile hotspot)
  - Disable VPN temporarily
  - Whitelist Livepeer domains:
    - `*.livepeer.com`
    - `*.livepeer.studio`
    - `*.livepeer.monster`

#### B. Browser Issues
- **Check:** Browser console for errors
- **Solution:**
  - Use Chrome or Firefox (best WebRTC support)
  - Disable browser extensions (especially ad blockers)
  - Try incognito/private mode
  - Update browser to latest version

#### C. STUN/TURN Server Issues
- **Check:** ICE connection state in browser console
- **Solution:** Network might block UDP traffic
  - WebRTC will try to use TURN over TCP as fallback
  - If still fails, HLS fallback will activate

### 3. 📹 "Camera Permission Denied"

**Problem:** Browser can't access camera/microphone.

**Solutions:**

1. **Browser Settings:**
   - Click lock icon in address bar
   - Set Camera and Microphone to "Allow"
   - Reload page

2. **System Settings:**
   - **Windows:** Settings → Privacy → Camera/Microphone
   - **macOS:** System Preferences → Security & Privacy → Camera/Microphone
   - **Linux:** Check distribution-specific settings

3. **Common Issues:**
   - Camera in use by another app (close Zoom, Discord, etc.)
   - Browser doesn't have system permission
   - Using HTTP instead of HTTPS (camera requires secure context)

### 4. ⏱️ "High Latency Issues"

**Problem:** Stream has 10-30 second delay instead of expected 0.5-3s.

**Diagnosis:**
```javascript
// Check in browser console
console.log('Check if using WebRTC or HLS');
// Look for in network tab:
// - whep:// URLs = WebRTC (low latency)
// - .m3u8 URLs = HLS (higher latency)
```

**Solutions:**

1. **Ensure WebRTC is Working:**
   - Check StreamDebugPanel for WebRTC support
   - Look for B-frames errors (forces HLS fallback)
   - Verify browser compatibility

2. **Stream Settings:**
   - Keyframe interval: 2 seconds (not 0 or auto)
   - Bitrate: Don't exceed your upload speed
   - Resolution: Start with 720p for testing

3. **Network Optimization:**
   - Use wired connection over WiFi
   - Close bandwidth-heavy applications
   - Check upload speed: need at least 5 Mbps for 720p

### 5. 🔄 "Stream Keeps Disconnecting"

**Problem:** Stream randomly stops or reconnects frequently.

**Solutions:**

1. **Network Stability:**
   ```bash
   # Test connection stability (Linux/Mac)
   ping -c 100 rtmp.livepeer.com
   # Look for packet loss percentage
   ```

2. **Bitrate Settings:**
   - Reduce bitrate to 70% of upload speed
   - Use CBR (Constant Bitrate) instead of VBR
   - Enable "Enable network optimizations" in OBS

3. **Stream Health Monitoring:**
   - Check Livepeer Studio dashboard
   - Monitor "dropped frames" in OBS (should be < 1%)
   - Look for encoder overload warnings

### 6. 🎥 "No Stream Preview/Player Shows Black"

**Problem:** Player doesn't show video even though stream is active.

**Debug Steps:**

1. **Check Stream Status:**
   ```javascript
   // In browser console
   fetch('/api/stream-status/' + playbackId)
     .then(r => r.json())
     .then(console.log);
   ```

2. **Verify Playback Sources:**
   - Open StreamDebugPanel
   - Check if sources are available
   - Look for errors in console

3. **Common Fixes:**
   - Wait 5-10 seconds for transcoding
   - Refresh the page
   - Check if stream is actually live in Livepeer Studio

## Advanced Debugging

### Browser Console Commands

```javascript
// 1. Check WebRTC Support
console.log('WebRTC Supported:', !!window.RTCPeerConnection);

// 2. List Media Devices
navigator.mediaDevices.enumerateDevices()
  .then(devices => {
    console.log('Audio Inputs:', devices.filter(d => d.kind === 'audioinput'));
    console.log('Video Inputs:', devices.filter(d => d.kind === 'videoinput'));
  });

// 3. Test getUserMedia
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    console.log('✅ Media access granted');
    stream.getTracks().forEach(t => t.stop());
  })
  .catch(err => console.error('❌ Media error:', err));

// 4. Check for B-frames in error messages
// Look for these patterns in console:
// - "contains b-frames"
// - "codec not supported"
// - "profile not baseline"
```

### OBS Log Analysis

1. **Enable Debug Logging:**
   - Settings → Advanced → Log Level: Debug
   - Help → Log Files → Upload Current Log File

2. **Key Things to Check:**
   - Encoder settings confirmation
   - Network stability metrics
   - Dropped frames percentage
   - Average render/encode time

### Network Diagnostics

```bash
# 1. Test RTMP connectivity
curl -I http://rtmp.livepeer.com

# 2. Test upload speed
# Use fast.com or speedtest.net

# 3. Trace route to Livepeer
traceroute rtmp.livepeer.com

# 4. Check firewall rules (Linux)
sudo iptables -L -n | grep -E "1935|443|80"
```

## Error Messages Explained

| Error | Meaning | Solution |
|-------|---------|----------|
| "Stream contains B-frames" | H.264 profile incompatible with WebRTC | Use Baseline profile, disable B-frames |
| "ICE connection failed" | WebRTC can't establish peer connection | Check firewall, try different network |
| "Stream open failed" | Stream not active or not found | Wait for stream to start, check stream key |
| "Playback rate limit exceeded" | Too many requests | Wait a few seconds, reduce request frequency |
| "403 Forbidden" | Stream is private or geo-blocked | Check stream settings in Livepeer Studio |
| "WebRTC handshake timeout" | Connection took too long | Poor network, try HLS fallback |

## Performance Optimization

### For Streamers

1. **Optimal Settings for Low Latency:**
   ```
   Resolution: 1280x720 (720p)
   FPS: 30
   Bitrate: 2500-3500 kbps
   Keyframe: 2 seconds
   Profile: Baseline
   Preset: veryfast
   B-frames: 0
   ```

2. **Network Requirements:**
   - Minimum: 5 Mbps upload
   - Recommended: 10+ Mbps upload
   - Stable connection (low jitter/packet loss)

### For Viewers

1. **Best Experience:**
   - Chrome or Firefox browser
   - Stable internet (3+ Mbps for 720p)
   - Disable VPN/proxy
   - Close other tabs/applications

2. **If Experiencing Issues:**
   - Refresh page to retry WebRTC
   - HLS fallback will activate automatically
   - Lower quality setting if buffering

## Platform-Specific Notes

### Safari/iOS
- WebRTC support is limited
- May default to HLS more often
- Ensure iOS 14.3+ for better WebRTC

### Mobile Browsers
- Data saver modes may interfere
- Portrait orientation may cause issues
- Consider native app for better performance

### Corporate Networks
- Often block WebRTC/RTMP ports
- May require IT approval
- Consider using mobile hotspot

## Getting Help

1. **Check Debug Panel:**
   - Open StreamDebugPanel in the app
   - Review errors and warnings
   - Copy debug info for support

2. **Livepeer Resources:**
   - [Livepeer Docs](https://docs.livepeer.org)
   - [Livepeer Discord](https://discord.gg/livepeer)
   - [Status Page](https://livepeer.statuspage.io)

3. **Common Quick Fixes:**
   - Restart browser
   - Clear browser cache
   - Try incognito mode
   - Switch networks
   - Update browser

## Summary Checklist

Before reporting an issue, check:

- [ ] Using H.264 Baseline profile (no B-frames)
- [ ] Keyframe interval set to 2 seconds
- [ ] Browser is Chrome or Firefox
- [ ] Camera/mic permissions granted
- [ ] No VPN or firewall blocking connection
- [ ] Stream is active in Livepeer Studio
- [ ] Network speed is sufficient
- [ ] No other apps using camera
- [ ] Browser extensions disabled
- [ ] Console checked for errors

If all above are checked and issues persist, collect:
1. Browser console logs
2. StreamDebugPanel screenshot
3. Network speed test results
4. OBS log file (if using OBS)
5. Exact error messages

This information will help diagnose and resolve the issue quickly.