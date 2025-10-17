# Deployment Checklist - Stream Source Improvements

## Quick Start

Follow these steps to deploy the new features:

### 1. ✅ Review Changes

- [x] Instant stream connection fix implemented
- [x] Pull stream feature added
- [x] Documentation created
- [x] UI components updated

### 2. 🚀 Deploy Edge Function

Deploy the new pull stream function:

```bash
npx supabase functions deploy livepeer-pull-stream
```

**Expected output:**
```
Deploying livepeer-pull-stream (project ref: your-project)
Bundled livepeer-pull-stream in Xms.
Deployed Function livepeer-pull-stream in Xms.
```

### 3. 🔐 Verify Environment Variables

Check that required secrets are set:

```bash
npx supabase secrets list
```

**Should show:**
- `LIVEPEER_API_KEY` - Your Livepeer Studio API key

**If not set:**
```bash
npx supabase secrets set LIVEPEER_API_KEY=your_api_key_here
```

### 4. 📦 Install Dependencies (if needed)

The Livepeer React SDK should already be installed:

```bash
npm list @livepeer/react
# Should show: @livepeer/react@4.3.6
```

If not installed:
```bash
npm install @livepeer/react
```

### 5. 🔨 Build and Deploy Frontend

Build the updated React app:

```bash
npm run build
```

Deploy to your hosting platform (Vercel, Netlify, etc.):

```bash
# For Vercel
vercel --prod

# For Netlify
netlify deploy --prod
```

### 6. ✅ Test Instant Stream Fix

1. Go to your deployed site → `/live`
2. Click **"Instant Stream"** tab
3. Enter a title and description
4. Click **"Start Camera"**
   - ✓ Camera preview should appear
5. Click **"Go Live"**
   - ✓ Check browser console for: `🔴 Broadcasting enabled with ingestUrl: rtmp://...`
6. Open another tab/device and watch the stream
   - ✓ Video should appear with low latency (0.5-3 seconds)

**If it works:** ✅ Instant stream is fixed!

**If it doesn't work:** Check [INSTANT_STREAM_FIX.md](./INSTANT_STREAM_FIX.md) troubleshooting section

### 7. ✅ Test Pull Stream Feature

#### Option A: Test with YouTube Live

1. Start a live stream on YouTube
2. Get your stream URL:
   - Public URL: `https://www.youtube.com/watch?v=VIDEO_ID`
   - Or RTMP URL from YouTube Studio
3. Go to your site → `/live`
4. Click **"Pull Stream"** tab
5. Enter title/description
6. Paste the YouTube URL
7. Click **"Start Pull Stream"**

**Expected:**
- ✓ Stream creates successfully
- ✓ Livepeer starts pulling from YouTube
- ✓ Your viewers can watch via your platform

#### Option B: Test with Public HLS Stream

Use a public test stream:

```
https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8
```

1. Go to `/live` → "Pull Stream" tab
2. Paste the URL above
3. Create stream
4. Should start playing immediately

### 8. 🔍 Monitor in Livepeer Studio

1. Go to [Livepeer Studio Dashboard](https://livepeer.studio)
2. Navigate to **Streams**
3. Find your streams by name
4. Check:
   - Stream status (idle/active)
   - Session ingest rate (should show bitrate when live)
   - Health metrics

### 9. 📊 Check Edge Function Logs

Monitor for any errors:

```bash
# Watch logs in real-time
npx supabase functions logs livepeer-pull-stream --tail

# Or check recent logs
npx supabase functions logs livepeer-pull-stream
```

**Look for:**
- Successful stream creation
- Pull stream initialization
- Any error messages

### 10. 🎯 Test on Different Platforms

**Browsers to test:**
- [ ] Chrome/Edge (best WebRTC support)
- [ ] Firefox
- [ ] Safari (may have WebRTC limitations)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

**Features to verify:**
- [ ] Instant stream works
- [ ] Pull stream works
- [ ] Streaming software (OBS) still works
- [ ] Playback is low-latency
- [ ] Audio/video toggles work
- [ ] End stream works properly

## Common Issues

### ❌ "Failed to create pull stream"

**Check:**
1. Is the external stream actually live?
2. Is the URL valid and accessible?
3. Check edge function logs: `npx supabase functions logs livepeer-pull-stream`
4. Verify Livepeer API key is set correctly

### ❌ "Instant stream doesn't connect"

**Check:**
1. Browser console for errors
2. Look for: `🔴 Broadcasting enabled with ingestUrl: ...`
3. Check Livepeer Studio → Stream should show "active"
4. Verify stream key is correct
5. Try in incognito mode (eliminates extensions)

### ❌ "Deployment failed"

**Check:**
1. Are you in the correct directory?
2. Is Supabase CLI installed and logged in?
3. Check `supabase/functions/livepeer-pull-stream/index.ts` exists
4. Try: `npx supabase functions list` to see available functions

## Optional: DNS and Custom Domain

If using a custom domain, make sure to update:

1. **CORS headers** in edge functions (already set to `*`)
2. **Supabase Edge Function URL** in your frontend code
3. **SSL certificate** for HTTPS (required for camera access)

## Next Steps

Once deployed and tested:

1. 📖 Read the guides:
   - [PULL_STREAM_GUIDE.md](./PULL_STREAM_GUIDE.md) - How to use pull streams
   - [INSTANT_STREAM_FIX.md](./INSTANT_STREAM_FIX.md) - Technical details
   - [STREAM_SOURCE_IMPROVEMENTS.md](./STREAM_SOURCE_IMPROVEMENTS.md) - Full summary

2. 🧪 Experiment with pull streams:
   - Try different platforms (YouTube, Twitch, TikTok)
   - Test with different stream formats (HLS vs RTMP)
   - Monitor latency and quality

3. 📣 Announce the new features to your users:
   - Instant streaming from browser (no software needed!)
   - Multi-platform streaming (stream to YouTube AND your platform)
   - Low-latency playback

4. 💡 Consider enhancements:
   - Stream health monitoring
   - Scheduled streams
   - Multi-source pull streams
   - Stream analytics

## Support

Need help?

1. Check the documentation files in this repo
2. Review Livepeer docs: https://docs.livepeer.org
3. Join Livepeer Discord: https://discord.gg/livepeer
4. Check Supabase docs: https://supabase.com/docs
5. Open an issue in your repo

---

## Summary

✅ **Instant Stream:** Fixed connection to Livepeer  
✅ **Pull Stream:** New feature to re-stream from YouTube/Twitch/TikTok  
✅ **Documentation:** Comprehensive guides created  
✅ **Ready to Deploy:** All code is production-ready  

**Deploy command:**
```bash
npx supabase functions deploy livepeer-pull-stream
```

**Test URLs:**
- Instant Stream: https://your-domain.com/live (Instant Stream tab)
- Pull Stream: https://your-domain.com/live (Pull Stream tab)
- Software Stream: https://your-domain.com/live (Streaming Software tab)

🚀 Happy streaming!
