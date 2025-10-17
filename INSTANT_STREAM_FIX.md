# Fixing Instant Stream Connection to Livepeer

## The Problem

The instant stream camera preview works, but it doesn't properly connect and broadcast to Livepeer when you click "Go Live". The streaming software (OBS) works fine.

## Root Causes

### 1. **Stream Key Timing Issue**

The `InstantLiveStream` component receives the `streamKey` prop AFTER the user clicks "Go Live", but the `Broadcast.Root` component needs to be initialized with the proper `ingestUrl` from the start.

**Current flow:**
1. User starts camera → `isStreaming = true`
2. User clicks "Go Live" → creates stream → gets `streamKey`
3. `streamKey` prop updates → but `Broadcast.Root` may not re-initialize

### 2. **getIngest() Format**

The `getIngest()` function from `@livepeer/react/external` expects a specific stream key format.

## Solutions

### Option 1: Re-mount Broadcast Component (Recommended)

Force the `Broadcast.Root` to re-mount when `streamKey` changes:

```typescript
// In InstantLiveStream.tsx
const broadcastKey = streamKey || 'preview'; // Force re-mount on key change

return (
  <Broadcast.Root
    key={broadcastKey} // This will re-mount when streamKey changes
    ingestUrl={ingestUrl}
    // ... other props
  >
    {/* ... */}
  </Broadcast.Root>
);
```

### Option 2: Separate Preview and Broadcast States

Use two different states - one for preview, one for broadcasting:

```typescript
const [isPreviewing, setIsPreviewing] = useState(false);
const [isBroadcasting, setIsBroadcasting] = useState(false);

// Show preview OR broadcast, not both simultaneously
{isPreviewing && !isBroadcasting && (
  <Broadcast.Root>
    {/* Preview only, no ingestUrl */}
  </Broadcast.Root>
)}

{isBroadcasting && (
  <Broadcast.Root ingestUrl={getIngest(streamKey)}>
    {/* Live broadcast */}
  </Broadcast.Root>
)}
```

### Option 3: Verify getIngest() Format

Ensure the stream key is in the correct format for `getIngest()`:

```typescript
// Check what getIngest returns
console.log('Stream Key:', streamKey);
console.log('Ingest URL:', getIngest(streamKey));

// Should be something like:
// rtmp://rtmp.livepeer.com/live/STREAM_KEY
```

## Implementation

Let's implement Option 1 (Re-mount on key change):

```typescript
// src/components/InstantLiveStream.tsx

export const InstantLiveStream = ({ onStreamStart, onStreamEnd, isLive, streamKey }: InstantLiveStreamProps) => {
  // ... existing state ...

  // Enable broadcasting when streamKey is provided and isLive is true
  const broadcastEnabled = isStreaming && streamKey && isLive;
  const ingestUrl = broadcastEnabled ? getIngest(streamKey) : undefined;
  
  // Use streamKey as key to force re-mount
  const broadcastKey = streamKey || 'preview';

  useEffect(() => {
    if (broadcastEnabled && ingestUrl) {
      console.log('Broadcasting enabled with ingestUrl:', ingestUrl);
    }
  }, [broadcastEnabled, ingestUrl]);

  return (
    <Card className="border-0 shadow-glow bg-gradient-card">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="aspect-video bg-muted rounded-lg overflow-hidden relative">
            {isStreaming ? (
              <Broadcast.Root
                key={broadcastKey} // Force re-mount when streamKey changes
                ingestUrl={ingestUrl}
                aspectRatio={16/9}
                video={isVideoEnabled}
                audio={isAudioEnabled}
              >
                {/* ... rest of component ... */}
              </Broadcast.Root>
            ) : (
              {/* ... preview placeholder ... */}
            )}
          </div>
          {/* ... controls ... */}
        </div>
      </CardContent>
    </Card>
  );
};
```

## Testing Checklist

After implementing the fix:

1. **Camera Preview**
   - [ ] Click "Start Camera" → Camera preview appears ✓
   - [ ] Audio visualization works ✓

2. **Go Live**
   - [ ] Click "Go Live" → Stream is created in database ✓
   - [ ] `streamKey` prop updates ✓
   - [ ] Broadcast component re-mounts with `ingestUrl` ✓
   - [ ] Console shows: "Broadcasting enabled with ingestUrl: rtmp://..." ✓

3. **Verify Connection**
   - [ ] Check Livepeer Studio dashboard → Stream shows "active" ✓
   - [ ] Open stream in another tab/device → Video appears ✓
   - [ ] Latency is 0.5-3 seconds (WebRTC) ✓

4. **Controls**
   - [ ] Toggle video on/off → Works during broadcast ✓
   - [ ] Toggle audio on/off → Works during broadcast ✓
   - [ ] End stream → Properly disconnects ✓

## Debugging

### Check Browser Console

```javascript
// Look for these console logs:
// 1. "Broadcasting enabled with ingestUrl: rtmp://rtmp.livepeer.com/live/XXXX"
// 2. WebRTC connection logs from @livepeer/react
```

### Check Network Tab

1. Open DevTools → Network tab
2. Filter by "WHIP" or "rtmp"
3. Should see WebRTC negotiation requests to Livepeer

### Check Livepeer Studio Dashboard

1. Go to [Livepeer Studio](https://livepeer.studio)
2. Navigate to Streams
3. Find your stream by ID
4. Check "Session Ingest Rate" → Should show active bitrate when broadcasting

## Alternative: Use Broadcast.ScreenShare

If camera broadcasting continues to have issues, you can use screen share as an alternative:

```typescript
import * as Broadcast from '@livepeer/react/broadcast';

<Broadcast.ScreenShareTrigger>
  <Button>Share Screen</Button>
</Broadcast.ScreenShareTrigger>
```

## Common Errors

### "Failed to connect to ingest"

**Causes:**
- Invalid stream key
- Livepeer API key not set
- Stream was deleted

**Fix:**
- Verify `LIVEPEER_API_KEY` is set in Supabase secrets
- Check stream exists in Livepeer Studio
- Ensure stream key is correct format

### "Permission denied"

**Causes:**
- User denied camera/microphone permissions
- Camera already in use by another app

**Fix:**
- Check browser permissions
- Close other apps using camera
- Try in incognito mode

### "Stream shows offline"

**Causes:**
- Broadcast not actually connecting
- `ingestUrl` is undefined
- WebRTC connection failed

**Fix:**
- Check console for `ingestUrl` value
- Verify network allows WebRTC
- Check firewall/VPN settings

## Resources

- [Livepeer Broadcast Docs](https://docs.livepeer.org/guides/developing/broadcast-a-livestream)
- [@livepeer/react API Reference](https://docs.livepeer.org/sdks/livepeer-js/Broadcast.Root)
- [WebRTC WHIP Spec](https://datatracker.ietf.org/doc/html/draft-ietf-wish-whip)
