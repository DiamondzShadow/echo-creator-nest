# Video Thumbnail Debugging & Fix Guide

## Problem Identified

You were unable to see thumbnails for your videos. After investigation, I found several issues:

### Root Causes

1. **Insufficient Fallback Logic**: The VideoThumbnail component had fallback URLs but the order wasn't optimal
2. **Missing CORS Headers**: Images weren't loading due to CORS restrictions
3. **Limited Debugging**: No console logging to identify which URLs were failing
4. **Database May Have Missing Thumbnails**: Some videos might not have thumbnail URLs in the database

## Fixes Applied

### 1. Enhanced VideoThumbnail Component (`/src/components/VideoThumbnail.tsx`)

**Changes Made:**

- ✅ **Added Direct Livepeer URL as First Fallback**: Now tries the most reliable thumbnail source first
- ✅ **Added CORS Support**: Added `crossOrigin="anonymous"` to allow cross-origin image loading
- ✅ **Improved Fallback Chain**: Now tries 4 different thumbnail sources in order:
  1. Custom thumbnail URL (if set in database)
  2. Direct Livepeer URL: `https://livepeer.studio/api/playback/{playbackId}/thumbnail.jpg`
  3. Simple thumbnail URL (from helper function)
  4. Image cache URL: `https://image-cache.livepeer.studio/thumbnail?playbackId={playbackId}`
- ✅ **Added Debug Logging**: Console logs now show:
  - Which thumbnail sources are being tried
  - When thumbnails load successfully
  - When thumbnail sources fail
- ✅ **Better Error Handling**: More robust error handling with clearer feedback

### 2. Improved fix-thumbnails Function (`/supabase/functions/fix-thumbnails/index.ts`)

**Changes Made:**

- ✅ **Better Filtering**: Now correctly identifies which assets need thumbnail updates
- ✅ **Enhanced Logging**: Detailed console output showing:
  - How many assets were found
  - Which assets need updates
  - Success/failure for each update
- ✅ **Error Reporting**: Returns detailed error information including:
  - Number of successful updates
  - Number of errors
  - Specific error messages
  - Total counts for all categories

## How to Test & Deploy

### Step 1: Deploy the Updated Supabase Function

```bash
# Navigate to your project directory
cd /workspace

# Deploy the fix-thumbnails function
supabase functions deploy fix-thumbnails

# Verify deployment
supabase functions list
```

### Step 2: Run the Fix-Thumbnails Function

The function is automatically called when you visit the Videos page, but you can also manually trigger it:

**Option A: Through the Videos Page**
1. Go to your Videos page (`/videos`)
2. The page automatically calls `fix-thumbnails` on load
3. Check the browser console for results

**Option B: Manually via Supabase Dashboard**
1. Go to your Supabase Dashboard
2. Navigate to Edge Functions
3. Find `fix-thumbnails`
4. Click "Invoke" to run it manually

**Option C: Via curl**
```bash
curl -X POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/fix-thumbnails \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

### Step 3: Check Browser Console

Open your browser's developer tools (F12) and check the Console tab. You should see logs like:

```
VideoThumbnail: { title: "My Video", thumbnailUrl: "...", playbackId: "...", ... }
Thumbnail loaded successfully: https://livepeer.studio/api/playback/xxx/thumbnail.jpg
```

If you see errors like:
```
Thumbnail load error: https://... Step: 0
Trying direct URL: ...
```

This means the fallback system is working and trying different sources.

### Step 4: Verify Thumbnails are Loading

1. **Check the Videos Page**: Go to `/videos` and verify thumbnails are showing
2. **Check the Home Page**: Public videos should show thumbnails on the landing page
3. **Check Profile Pages**: Recordings should show thumbnails

## Troubleshooting

### If Thumbnails Still Don't Show

1. **Check Browser Console**:
   - Look for error messages about thumbnail loading
   - Verify which URLs are being tried
   - Check if all fallback URLs are failing

2. **Verify Database Has Playback IDs**:
   ```sql
   SELECT id, title, status, livepeer_playback_id, thumbnail_url 
   FROM assets 
   WHERE status = 'ready' 
   LIMIT 10;
   ```
   - Ensure `livepeer_playback_id` is not NULL
   - Check if `thumbnail_url` is populated

3. **Test Thumbnail URLs Directly**:
   - Copy a thumbnail URL from the console
   - Open it in a new browser tab
   - Verify the image loads
   - If it doesn't load, there might be an issue with your Livepeer account

4. **Check Network Tab**:
   - Open Developer Tools → Network tab
   - Filter by "Img"
   - Reload the page
   - Check if thumbnail requests are:
     - Being sent
     - Returning 200 OK status
     - Or returning errors (404, 403, etc.)

### Common Issues

**Issue: "All thumbnail sources failed"**
- **Cause**: No playback ID exists, or Livepeer hasn't generated thumbnails yet
- **Fix**: Wait a few minutes after upload for Livepeer to process the video

**Issue: CORS errors in console**
- **Cause**: Image host blocking cross-origin requests
- **Fix**: This should be resolved with the `crossOrigin="anonymous"` attribute I added

**Issue: Thumbnails load slowly**
- **Cause**: Images are loading lazily
- **Fix**: This is expected behavior and improves performance

**Issue: Some thumbnails show, others don't**
- **Cause**: Some videos might be missing playback IDs or thumbnail URLs
- **Fix**: Run the `fix-thumbnails` function to backfill missing thumbnails

## Testing New Uploads

1. **Upload a new video** through the Upload tab
2. **Wait for processing** (status should change to "ready")
3. **Refresh the page** to see the thumbnail
4. **Check console** to verify thumbnail URL was set by the webhook

The webhook (`livepeer-webhook/index.ts`) automatically sets thumbnail URLs when videos become ready, so new uploads should work automatically.

## What Each File Does

### Frontend Components

- **`VideoThumbnail.tsx`**: Main component that displays video thumbnails with fallback logic
- **`PublicVideos.tsx`**: Shows public videos on the homepage
- **`Videos.tsx`**: Main videos management page (calls fix-thumbnails on load)
- **`LiveStreamCard.tsx`**: Shows stream recordings with thumbnails
- **`Profile.tsx`**: User profile page with recordings

### Backend Functions

- **`fix-thumbnails/index.ts`**: Backfills missing thumbnail URLs for existing videos
- **`livepeer-webhook/index.ts`**: Handles Livepeer webhook events and sets thumbnails automatically
- **`livepeer-asset/index.ts`**: Manages video asset operations and status polling

### Utilities

- **`livepeer-thumbnails.ts`**: Helper functions for generating thumbnail URLs

## Next Steps

1. ✅ Deploy the updated `fix-thumbnails` function
2. ✅ Test on the Videos page
3. ✅ Check browser console for debugging information
4. ✅ Upload a new video to test the webhook integration
5. ✅ Verify all existing videos have thumbnails

## Summary

The thumbnail system now has:
- ✅ **4-level fallback system** for maximum reliability
- ✅ **CORS support** for loading external images
- ✅ **Comprehensive logging** for debugging
- ✅ **Automatic thumbnail generation** via webhooks
- ✅ **Manual fix function** to backfill missing thumbnails
- ✅ **Graceful fallback UI** when thumbnails aren't available

Your thumbnails should now display properly. If you still encounter issues, check the browser console for specific error messages and refer to the Troubleshooting section above.
