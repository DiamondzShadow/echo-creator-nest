# Livepeer Webhook Setup for IPFS

Your platform now automatically uploads recordings to IPFS through Livepeer.

## How It Works

1. **Stream Ends** → LiveKit saves recording to Storj
2. **LiveKit Webhook** → Imports recording to Livepeer with IPFS enabled
3. **Livepeer Processes** → Transcodes video and uploads to IPFS
4. **Livepeer Webhook** → Updates your database with IPFS CID and URLs

## Setup Required

### Configure Livepeer Webhook

In your [Livepeer Dashboard](https://livepeer.studio/dashboard/developers/webhooks):

1. **Click "Create Webhook"**
2. **Name**: "Diamondz IPFS Uploads"
3. **URL**: `https://woucixqbnzmvlvnaaelb.supabase.co/functions/v1/livepeer-webhook`
4. **Events to subscribe**:
   - ✅ `asset.ready` - When video processing + IPFS upload is complete
   - ✅ `asset.failed` - When processing fails
   - ✅ `stream.started` - When live stream starts
   - ✅ `stream.idle` - When live stream ends

5. **Click "Create"**

## What Gets Stored

When a recording is processed, your `assets` table receives:

```typescript
{
  ipfs_cid: "QmX7h8...",                           // IPFS content ID
  ipfs_url: "ipfs://QmX7h8...",                    // IPFS protocol URL
  ipfs_gateway_url: "https://ipfs.io/ipfs/QmX7h8...", // Public gateway URL
  livepeer_playback_id: "abc123",                 // For Livepeer player
  storage_provider: "ipfs",                        // Indicates IPFS storage
  status: "ready"                                  // Processing complete
}
```

## Playback Options

Your videos can be played from multiple sources:

### Option 1: Livepeer Player (Recommended)
```tsx
<VideoPlayer playbackId={asset.livepeer_playback_id} />
```
**Benefits**: CDN-backed, adaptive bitrate, faster loading

### Option 2: Direct IPFS
```tsx
<video src={asset.ipfs_gateway_url} />
```
**Benefits**: Decentralized, censorship-resistant

### Option 3: Hybrid Approach
```tsx
// Use Livepeer for live/recent, IPFS for archive
const src = isRecent 
  ? `https://livepeercdn.studio/${asset.livepeer_playback_id}/video`
  : asset.ipfs_gateway_url;
```

## Monitoring

Check edge function logs to see IPFS uploads:
```bash
# In Lovable, view backend logs for:
- livepeer-webhook: IPFS data received
- livekit-webhook: Import to Livepeer initiated
```

## Fallback Behavior

If Livepeer import fails:
- Recording is still saved to Storj
- Asset is created with Storj URL
- You can manually re-import later

## Cost Considerations

- **Livepeer**: Free tier includes IPFS uploads
- **IPFS Pinning**: Livepeer automatically pins for you
- **Bandwidth**: Gateway requests may have limits

For high-volume production, consider:
- Custom IPFS gateway (Pinata, Infura, etc.)
- Your own IPFS node
- Arweave for permanent storage

## Testing

1. **Start a stream** with recording enabled
2. **End the stream**
3. **Check logs** in backend for:
   ```
   📤 Uploading recording to Livepeer with IPFS...
   ✅ Recording imported to Livepeer
   ```
4. **Wait 2-5 minutes** for processing
5. **Check your asset** - should have `ipfs_cid` populated

Your infrastructure is ready - just configure the webhook URL in Livepeer dashboard!
