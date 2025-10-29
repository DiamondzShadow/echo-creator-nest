# Quick Deployment Guide - 5 Minutes ⚡

## What Was Fixed
✅ Video thumbnails now show automatically  
✅ All Livepeer webhook events handled  
✅ Advanced thumbnail system available

---

## Deploy in 3 Steps

### 1️⃣ Deploy Functions (2 min)
```bash
# Deploy updated webhook
supabase functions deploy livepeer-webhook

# Deploy updated asset function
supabase functions deploy livepeer-asset
```

### 2️⃣ Run Migrations (1 min)
```bash
# Fix existing videos + add new status
supabase db push
```

### 3️⃣ Configure Livepeer Webhook (2 min)

1. Go to https://livepeer.studio
2. Navigate to **Developers** → **Webhooks**
3. Click **"Create Webhook"**
4. Enter your URL:
   ```
   https://[your-project].supabase.co/functions/v1/livepeer-webhook
   ```
5. Select **ALL** these events:
   - ✅ asset.created
   - ✅ asset.updated
   - ✅ asset.ready
   - ✅ asset.failed
   - ✅ asset.deleted
6. Click **"Create Webhook"**

---

## Verify It Works ✓

### Test 1: Upload a video
- Upload a new video through your app
- Wait for processing to complete
- ✅ Thumbnail should appear automatically

### Test 2: Check existing videos
- Go to your Videos page
- ✅ Existing videos should now have thumbnails

### Test 3: Monitor webhook
```bash
# Watch webhook events in real-time
supabase functions logs livepeer-webhook --tail
```

You should see:
```
asset.created event processed
asset.updated event processed  
asset.ready event processed
Thumbnail URL set: https://livepeer.studio/api/playback/.../thumbnail.jpg
```

---

## What Happens Now

### When Users Upload Videos:

```
Upload Started → [asset.created] → Shows "Processing..."
     ↓
Processing    → [asset.updated] → Thumbnail appears!
     ↓
Ready         → [asset.ready]   → Full playback enabled ✓
```

### Thumbnails Automatically:
- ✅ Captured from Livepeer API
- ✅ Stored in database
- ✅ Displayed in UI
- ✅ Work for all new uploads
- ✅ Backfilled for existing videos

---

## Troubleshooting

**Thumbnails still not showing?**
```bash
# Check if migration ran
supabase migration list

# Check webhook logs
supabase functions logs livepeer-webhook --tail

# Verify webhook is configured in Livepeer Studio
```

**Webhook not receiving events?**
1. Verify webhook URL in Livepeer Studio
2. Make sure all asset events are selected
3. Test with a new upload

**Need more help?**
- See `IMPLEMENTATION_SUMMARY.md` for complete details
- See `LIVEPEER_WEBHOOK_COMPLETE_IMPLEMENTATION.md` for advanced usage

---

## That's It! 🎉

Your video thumbnails are now working!

**New videos:** Thumbnails captured automatically ✓  
**Existing videos:** Fixed by migration ✓  
**All events:** Handled by webhook ✓

---

## Optional: Advanced Features

Want thumbnail scrubbing? Check out:
- `src/lib/livepeer-thumbnails.ts` - Complete thumbnail toolkit
- `LIVEPEER_WEBHOOK_COMPLETE_IMPLEMENTATION.md` - Usage examples

Ready for:
- Thumbnail preview on hover
- Seek bar thumbnails
- Multiple thumbnail sizes
- Time-based thumbnails
