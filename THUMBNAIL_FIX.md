# Video Thumbnail Fix

## Problem
Video thumbnails weren't showing for uploaded videos because the code wasn't capturing thumbnail URLs from Livepeer's API responses.

## Root Cause
1. **livepeer-webhook/index.ts** - When processing `asset.ready` events, the webhook wasn't extracting the thumbnail URL from Livepeer's response
2. **livepeer-asset/index.ts** - When polling for asset status, the function wasn't storing the thumbnail URL
3. Existing videos in the database had NULL thumbnail_url values

## Solution

### 1. Updated Webhook Handler (`supabase/functions/livepeer-webhook/index.ts`)
- Now extracts and stores thumbnail URL when asset becomes ready
- Uses Livepeer's standard thumbnail format: `https://livepeer.studio/api/playback/{playbackId}/thumbnail.jpg`
- Also captures duration and file size for better metadata

### 2. Updated Asset Status Function (`supabase/functions/livepeer-asset/index.ts`)
- Now extracts and stores thumbnail URL when checking asset status
- Properly stores IPFS metadata in dedicated columns instead of appending to description
- Logs thumbnail URL for debugging

### 3. Database Migration (`supabase/migrations/20251029000000_backfill_thumbnail_urls.sql`)
- Backfills thumbnail URLs for all existing videos that have a playback ID
- Only updates videos with status='ready' that are missing thumbnails
- Adds documentation comment for the thumbnail_url column

## How Livepeer Thumbnails Work
Livepeer automatically generates thumbnails for all video assets. The thumbnail URL follows this format:
```
https://livepeer.studio/api/playback/{playbackId}/thumbnail.jpg
```

You can also get thumbnails at specific timestamps:
```
https://livepeer.studio/api/playback/{playbackId}/thumbnail.jpg?time=10s
```

## Testing
1. **For New Uploads**: Upload a new video and verify the thumbnail appears after processing
2. **For Existing Videos**: Run the migration to backfill thumbnail URLs
3. **Fallback**: The UI already has a fallback to show a placeholder if thumbnail fails to load

## Deployment Steps
1. Deploy the updated Supabase Edge Functions:
   ```bash
   supabase functions deploy livepeer-webhook
   supabase functions deploy livepeer-asset
   ```

2. Run the migration to backfill existing videos:
   ```bash
   supabase db push
   ```

3. Verify thumbnails are showing in the Videos page

## UI Fallback
The Videos page (`src/pages/Videos.tsx`) already has proper fallback handling:
```tsx
{asset.thumbnail_url ? (
  <img src={asset.thumbnail_url} alt={asset.title} className="w-full h-full object-cover" />
) : (
  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
    <Play className="h-16 w-16 text-primary" />
  </div>
)}
```

This ensures that if a thumbnail fails to load or doesn't exist, users see a nice gradient background with a play icon instead of a broken image.
