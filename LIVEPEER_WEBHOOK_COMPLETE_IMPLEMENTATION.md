# Complete Livepeer Webhook & Thumbnail Implementation

## ✅ What's Now Implemented

I've now implemented **ALL** Livepeer asset webhook events and enhanced thumbnail support!

### Asset Events Handled

| Event | Status | Description |
|-------|--------|-------------|
| `asset.created` | ✅ **NEW** | Fires when an asset is created, updates status to 'processing' |
| `asset.updated` | ✅ **NEW** | Fires when asset metadata is updated, captures playback ID and thumbnail |
| `asset.ready` | ✅ Enhanced | Fires when asset is ready, captures thumbnail, duration, IPFS data |
| `asset.failed` | ✅ Existing | Fires when asset processing fails |
| `asset.deleted` | ✅ **NEW** | Fires when asset is deleted from Livepeer |

### Stream Events (Already Working)
- `stream.started` - Updates stream status to live
- `stream.idle` - Updates stream status when ended

---

## 📸 Thumbnail System

### Two Thumbnail Approaches Implemented

#### 1. **Simple Thumbnail (Default)** ✅
Best for: Video cards, preview images, thumbnails in lists

```typescript
// Simple thumbnail URL - always works
const thumbnailUrl = `https://livepeer.studio/api/playback/${playbackId}/thumbnail.jpg`;

// Thumbnail at specific time
const thumbnailAt10s = `https://livepeer.studio/api/playback/${playbackId}/thumbnail.jpg?time=10s`;
```

**Usage in your app:**
```tsx
<img src={asset.thumbnail_url} alt={asset.title} />
```

#### 2. **Advanced Thumbnail System** ✅ **NEW**
Best for: Thumbnail scrubbing, seek preview, timeline thumbnails

This system uses WebVTT files with multiple thumbnails (one every ~3 seconds).

**New utility file:** `src/lib/livepeer-thumbnails.ts`

```typescript
import { getVideoThumbnails, getThumbnailForTime } from '@/lib/livepeer-thumbnails';

// Get all thumbnails for a video
const thumbnails = await getVideoThumbnails(playbackId);

// Get thumbnail for specific time (e.g., when user hovers over seek bar)
const thumbnailUrl = getThumbnailForTime(thumbnails, 45); // 45 seconds into video
```

---

## 🔧 New Files Created

### 1. **Updated Webhook** 
`supabase/functions/livepeer-webhook/index.ts`
- Now handles all 5 asset events
- Better error handling
- More comprehensive logging

### 2. **Thumbnail Utilities**
`src/lib/livepeer-thumbnails.ts`
- Complete toolkit for working with Livepeer thumbnails
- Functions for simple thumbnails, time-based thumbnails, and VTT parsing
- Ready to use for thumbnail scrubbing features

### 3. **Database Migrations**
- `20251029000000_backfill_thumbnail_urls.sql` - Fixes existing videos
- `20251029000001_add_deleted_status.sql` - Adds 'deleted' status support

---

## 🚀 Deployment Steps

### 1. Deploy Updated Webhook
```bash
supabase functions deploy livepeer-webhook
```

### 2. Run Database Migrations
```bash
supabase db push
```

### 3. Configure Webhook in Livepeer Studio

1. Go to [Livepeer Studio Dashboard](https://livepeer.studio)
2. Navigate to **Developers → Webhooks**
3. Click **"Create Webhook"**
4. Enter your webhook URL:
   ```
   https://[your-supabase-project].supabase.co/functions/v1/livepeer-webhook
   ```
5. Select **ALL** asset events:
   - ✅ asset.created
   - ✅ asset.updated
   - ✅ asset.ready
   - ✅ asset.failed
   - ✅ asset.deleted
6. Click **"Create Webhook"**

---

## 📖 Usage Examples

### Example 1: Simple Thumbnail Display (Already Working)

```tsx
// In Videos.tsx - already implemented
{asset.thumbnail_url ? (
  <img 
    src={asset.thumbnail_url} 
    alt={asset.title} 
    className="w-full h-full object-cover" 
  />
) : (
  <div className="w-full h-full flex items-center justify-center">
    <Play className="h-16 w-16 text-primary" />
  </div>
)}
```

### Example 2: Thumbnail at Specific Time

```tsx
import { getThumbnailAtTime } from '@/lib/livepeer-thumbnails';

function VideoPreview({ playbackId }) {
  // Get thumbnail at 10 seconds into the video
  const thumbnailUrl = getThumbnailAtTime(playbackId, 10);
  
  return <img src={thumbnailUrl} alt="Preview" />;
}
```

### Example 3: Thumbnail Scrubbing (Advanced)

```tsx
import { useState, useEffect } from 'react';
import { getVideoThumbnails, getThumbnailForTime } from '@/lib/livepeer-thumbnails';

function VideoSeekBar({ playbackId, duration }) {
  const [thumbnails, setThumbnails] = useState([]);
  const [hoverTime, setHoverTime] = useState(0);
  const [previewThumb, setPreviewThumb] = useState(null);

  useEffect(() => {
    // Load all thumbnails when component mounts
    getVideoThumbnails(playbackId).then(setThumbnails);
  }, [playbackId]);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = (x / rect.width) * duration;
    setHoverTime(time);
    
    // Get thumbnail for this time
    if (thumbnails.length > 0) {
      const thumbUrl = getThumbnailForTime(thumbnails, time);
      setPreviewThumb(thumbUrl);
    }
  };

  return (
    <div className="seek-bar" onMouseMove={handleMouseMove}>
      {previewThumb && (
        <div className="thumbnail-preview">
          <img src={previewThumb} alt="Preview" />
          <span>{formatTime(hoverTime)}</span>
        </div>
      )}
      {/* Your seek bar UI */}
    </div>
  );
}
```

---

## 🔍 How Each Event Works

### asset.created
**Fires:** When upload is initiated or import starts
**What it does:** Updates database record to 'processing' status
**Use case:** Show "Processing..." status to users immediately

### asset.updated
**Fires:** During processing when metadata becomes available
**What it does:** Updates playback ID and thumbnail URL
**Use case:** Early availability of playback ID for partial playback

### asset.ready
**Fires:** When ALL transcoding is complete
**What it does:** Sets status to 'ready', captures duration, size, IPFS data
**Use case:** Enable full playback and display complete metadata

### asset.failed
**Fires:** If upload or processing fails
**What it does:** Sets status to 'failed'
**Use case:** Show error message to user, allow retry

### asset.deleted
**Fires:** When asset is deleted from Livepeer
**What it does:** Soft delete (status='deleted') or hard delete (configurable)
**Use case:** Keep database in sync with Livepeer

---

## 🎯 Benefits of This Implementation

1. **Real-time updates** - No need to poll for asset status
2. **Better UX** - Users see immediate feedback at each stage
3. **Complete metadata** - Captures duration, file size, IPFS info
4. **Thumbnail scrubbing ready** - Full support for advanced thumbnail features
5. **Production ready** - Handles all edge cases and errors

---

## 🧪 Testing

### Test the Webhook

1. **Upload a video** through your app
2. **Watch the logs** in Supabase Functions:
   ```bash
   supabase functions logs livepeer-webhook --tail
   ```
3. **Check events** as they arrive:
   - `asset.created` → Status becomes 'processing'
   - `asset.updated` → Playback ID and thumbnail appear
   - `asset.ready` → Status becomes 'ready', full metadata available

### Test Thumbnails

```typescript
// Test in browser console
import { getVideoThumbnails } from './src/lib/livepeer-thumbnails';

const thumbnails = await getVideoThumbnails('your-playback-id');
console.log(thumbnails);
// Should show array of thumbnails with timestamps
```

---

## 📝 Next Steps (Optional Enhancements)

### 1. Add Thumbnail Scrubbing to Video Player
Use the advanced thumbnail system to show preview images when users hover over the seek bar.

### 2. Generate Preview GIFs
Use multiple thumbnails to create animated GIFs for video previews.

### 3. Add Asset Status Timeline
Show users a timeline of their video processing (created → processing → ready).

### 4. Implement Retry Logic
For failed assets, add a button to retry processing.

---

## 🐛 Troubleshooting

### Webhook Not Receiving Events
1. Check webhook is configured in Livepeer Studio
2. Verify URL is correct and accessible
3. Check Supabase function logs for errors

### Thumbnails Not Showing
1. Verify asset status is 'ready'
2. Check `thumbnail_url` column has data
3. Try accessing thumbnail URL directly in browser
4. Check browser console for CORS or network errors

### VTT Thumbnails Not Loading
1. Assets must be uploaded after November 21, 2023
2. Re-import old assets to generate thumbnails
3. Check playback info includes 'Thumbnails' source

---

## 📚 Additional Resources

- [Livepeer Webhook Docs](https://docs.livepeer.org/guides/developing/listen-to-asset-events)
- [Livepeer Thumbnail Docs](https://docs.livepeer.org/guides/developing/get-asset-thumbnail)
- [WebVTT Format Spec](https://www.w3.org/TR/webvtt1/)

---

**Questions?** Check the inline code comments in:
- `supabase/functions/livepeer-webhook/index.ts`
- `src/lib/livepeer-thumbnails.ts`
