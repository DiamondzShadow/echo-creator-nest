# Viewer Stream Visibility Fix

## Problem
Viewers couldn't see the video stream even though the stream showed as "streaming" with viewer count. The broadcaster could see themselves, but viewers only saw "Waiting for video..."

## Root Cause
**Timing Issue**: The stream was marked as `is_live: true` in the database BEFORE the broadcaster actually published their video/audio tracks to the LiveKit room.

### The Race Condition:
1. Broadcaster clicks "Create Stream"
2. Stream record created with `is_live: true` ✅
3. Viewers see stream is live and try to join 👁️
4. **BUT** broadcaster hasn't published camera/mic tracks yet ❌
5. Viewers join empty room with no video tracks to subscribe to
6. Result: "Waiting for video..." message

## Solution Implemented

### 1. Changed Initial Stream Status
**File**: `src/pages/Live.tsx`
- Changed initial `is_live` value from `true` to `false` when creating stream record
- Stream is no longer visible to viewers until broadcaster is ready

### 2. Delayed Stream Activation
**File**: `src/components/InstantLiveStreamLiveKit.tsx`
- Moved `onStreamConnected` callback to trigger AFTER tracks are published
- Removed premature callback on room connection event
- Now called after `setCameraEnabled()` and `setMicrophoneEnabled()` complete

### 3. Database Update After Track Publication
**File**: `src/pages/Live.tsx` (onStreamConnected callback)
- Added database update to set `is_live: true` only after broadcaster publishes tracks
- This ensures viewers only see and join streams that have active video

### 4. Improved Viewer Experience
**File**: `src/pages/Watch.tsx`
- Added loading state for streams that exist but aren't live yet
- Shows "Stream Starting Soon..." message with spinner
- Prevents viewer from seeing empty video player
- Only fetches viewer token when `is_live: true` AND room exists

## Flow After Fix

### Broadcaster Side:
1. Click "Create Stream" → Stream created with `is_live: false`
2. Enter broadcasting interface → Local UI shows ready state
3. LiveKit room connects → Background preparation
4. **Camera/Mic publish** → Tracks now available in room
5. `onStreamConnected` callback fires → Database updated to `is_live: true`
6. Toast: "🎉 You're Live! Viewers can now see your stream"

### Viewer Side:
1. Browse streams → Only see streams where `is_live: true`
2. Click to watch → Check if stream is actually live
3. If `is_live: false` → Show "Stream Starting Soon..." with auto-refresh via real-time subscription
4. If `is_live: true` → Fetch viewer token and join room
5. Subscribe to broadcaster's published tracks → Video appears!

## Technical Details

### Key Changes:
- **Stream Creation**: `is_live: false` (was `true`)
- **Track Publishing**: Happens before stream activation (was after)
- **Viewer Token**: Only fetched when stream is confirmed live (was fetched prematurely)
- **UI Feedback**: Clear messaging during setup phase

### LiveKit Permissions (unchanged):
- Broadcaster: `canPublish: true`, `canSubscribe: true` ✅
- Viewer: `canPublish: false`, `canSubscribe: true` ✅
- Auto-subscribe: Enabled in room config ✅

### Event Flow:
```
Broadcaster:
  Room.connect() 
  → localParticipant.setCameraEnabled(true)
  → localParticipant.setMicrophoneEnabled(true)
  → onStreamConnected()
  → UPDATE live_streams SET is_live=true

Viewer (subscribed to real-time updates):
  Stream update received: is_live=true
  → Fetch viewer token
  → Room.connect()
  → Subscribe to remote participant tracks
  → Video renders!
```

## Testing Checklist

✅ Broadcaster can start stream successfully
✅ Broadcaster sees their own video immediately  
✅ Viewers don't see stream until broadcaster publishes tracks
✅ Viewers see "Stream Starting Soon..." during setup
✅ Viewers automatically connect when stream goes live (via real-time subscription)
✅ Viewers can see broadcaster's video once live
✅ Viewers can hear broadcaster's audio
✅ Multiple viewers can join simultaneously
✅ Stream ends cleanly for all participants

## Potential Future Improvements

1. **Add reconnection logic**: If broadcaster disconnects briefly, maintain `is_live` status
2. **Health checks**: Periodically verify tracks are still publishing
3. **Viewer notification**: Push notification when followed creator goes live
4. **Stream quality**: Dynamic bitrate adjustment based on viewer count
5. **Latency optimization**: Tune LiveKit settings for lower latency

## Related Files Modified

- `/workspace/src/pages/Live.tsx` - Stream creation and lifecycle
- `/workspace/src/components/InstantLiveStreamLiveKit.tsx` - Broadcaster component
- `/workspace/src/pages/Watch.tsx` - Viewer experience
- `/workspace/src/components/LiveKitViewer.tsx` - Already had good error handling (no changes needed)
- `/workspace/src/lib/livekit-config.ts` - Already had correct config (no changes needed)
- `/workspace/supabase/functions/livekit-token/index.ts` - Already had correct permissions (no changes needed)

## Conclusion

The fix ensures that viewers only attempt to join streams that have active video tracks, eliminating the race condition that caused the "streaming but no video" issue. The broadcaster's publishing flow now properly gates viewer access, and the UI provides clear feedback during all states.
