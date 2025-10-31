# Stream Cutoff When Viewer Joins - Fix

## Problem Description

The broadcaster's stream would disconnect when a viewer attempted to join and watch it. This critical issue prevented live streaming functionality from working properly.

## Root Causes Identified

### 1. **Stale Closure Variables in Event Handlers**
The `ParticipantConnected` and `ParticipantDisconnected` event handlers in `InstantLiveStreamLiveKit.tsx` were using `connectedRoom` from the closure, which could become stale if the component re-rendered. This could cause the wrong room instance to be referenced when updating viewer count.

### 2. **Insufficient Error Handling and Logging**
There was no visibility into WHY disconnections were happening (connection quality issues, network problems, identity conflicts, etc.)

### 3. **Potential Identity Conflicts**
The broadcaster identity pattern `host-${roomName}-${user.id}` was overly complex and could potentially cause conflicts. Additionally, viewer identities included the room name which wasn't necessary.

### 4. **No Reconnection Monitoring**
The application didn't monitor or handle reconnection attempts, making it impossible to detect and recover from temporary network issues.

## Solutions Implemented

### 1. Fixed Stale Closure Issues (InstantLiveStreamLiveKit.tsx)

**Before:**
```typescript
setTimeout(() => {
  if (mounted && connectedRoom) {
    setViewerCount(connectedRoom.remoteParticipants.size);
  }
}, 100);
```

**After:**
```typescript
if (mounted) {
  requestAnimationFrame(() => {
    if (mounted && newRoom) {
      setViewerCount(newRoom.remoteParticipants.size);
    }
  });
}
```

**Why this fixes it:**
- Uses `newRoom` (the actual room instance) instead of `connectedRoom` (closure variable)
- Uses `requestAnimationFrame` instead of `setTimeout` for more reliable state updates
- Prevents stale closure issues that could cause incorrect room references

### 2. Added Comprehensive Connection Monitoring

Added event handlers for:

#### Disconnection Logging
```typescript
newRoom.on(RoomEvent.Disconnected, (reason?: any) => {
  console.log('🔌 Room disconnected. Reason:', reason);
  console.log('Disconnect details:', {
    reason,
    mounted,
    roomState: newRoom?.state,
    participantCount: newRoom?.remoteParticipants.size,
  });
  setIsConnected(false);
});
```

#### Connection Quality Monitoring
```typescript
newRoom.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
  console.log('📶 Connection quality changed:', {
    quality,
    participant: participant?.identity || 'local',
    isLocal: participant === newRoom.localParticipant,
  });
  if (participant === newRoom.localParticipant && quality === 'poor') {
    toast({
      title: 'Poor Connection',
      description: 'Your connection quality is poor. Stream may be unstable.',
      variant: 'destructive',
    });
  }
});
```

#### Reconnection Tracking
```typescript
newRoom.on(RoomEvent.Reconnecting, () => {
  console.log('🔄 Attempting to reconnect to room...');
  toast({
    title: 'Reconnecting...',
    description: 'Attempting to restore connection',
  });
});

newRoom.on(RoomEvent.Reconnected, () => {
  console.log('✅ Reconnected to room successfully');
  toast({
    title: 'Reconnected',
    description: 'Connection restored successfully',
  });
});
```

**Why this helps:**
- Provides visibility into connection issues
- Warns users about connection quality problems
- Allows detection of automatic reconnection attempts
- Makes debugging much easier

### 3. Simplified Identity Generation (livekit-token/index.ts)

**Before:**
```typescript
// Broadcaster
const hostIdentity = `host-${roomName}-${user.id}`;

// Viewer
const viewerIdentity = `viewer-${roomName}-${userId}-${crypto.randomUUID().slice(0,8)}`;
```

**After:**
```typescript
// Broadcaster - Simpler, more stable identity
const hostIdentity = `host-${user.id}`;

// Viewer - Completely unique identity
const uniqueId = crypto.randomUUID();
const viewerIdentity = `viewer-${uniqueId}`;
```

**Why this fixes it:**
- Broadcaster identity is now simpler and truly unique per user
- Viewer identities are completely unique (no room name collision possible)
- Reduces chance of identity conflicts in LiveKit
- Each viewer gets a globally unique ID regardless of room

### 4. Enhanced Token Grants and Logging

Added:
- `canUpdateOwnMetadata: true` for broadcasters
- Comprehensive logging for token creation
- Room name in metadata for better tracking

```typescript
console.log('Creating broadcaster token with identity:', hostIdentity, 'for room:', roomName);
// ... token creation ...
console.log('Broadcaster token created successfully for room:', roomName);
```

## Files Modified

1. **`/workspace/src/components/InstantLiveStreamLiveKit.tsx`**
   - Fixed stale closure issues in event handlers
   - Added connection quality monitoring
   - Added reconnection event handlers
   - Enhanced disconnect logging

2. **`/workspace/supabase/functions/livekit-token/index.ts`**
   - Simplified broadcaster identity generation
   - Made viewer identities completely unique
   - Added comprehensive logging
   - Enhanced token grants

## Testing Checklist

After deploying these fixes, test the following scenarios:

### Broadcaster Side
- [ ] Start a stream successfully
- [ ] See viewer count update when viewers join
- [ ] See viewer count update when viewers leave
- [ ] Stream stays connected when viewers join
- [ ] Stream stays connected when multiple viewers join
- [ ] Receive warnings if connection quality degrades
- [ ] See reconnection toast if network briefly drops

### Viewer Side
- [ ] Can join stream as authenticated user
- [ ] Can join stream as anonymous user
- [ ] Multiple viewers can join simultaneously
- [ ] Video and audio work properly
- [ ] Can join and leave without affecting broadcaster
- [ ] Can rejoin after leaving

### Edge Cases
- [ ] Broadcaster network interruption - should auto-reconnect
- [ ] Viewer network interruption - should not affect broadcaster
- [ ] Multiple tabs as broadcaster - should handle gracefully
- [ ] Rapid viewer join/leave cycles - should remain stable

## Deployment Instructions

### 1. Deploy the Edge Function
```bash
cd /workspace
supabase functions deploy livekit-token
```

### 2. Verify Edge Function Logs
After deployment, test a stream and check the Supabase logs:
```bash
supabase functions logs livekit-token --follow
```

You should see:
- `Creating broadcaster token with identity: host-{userId} for room: {roomName}`
- `Broadcaster token created successfully for room: {roomName}`
- `Creating viewer token: { viewerIdentity: 'viewer-{uuid}', ... }`
- `Viewer token created successfully for room: {roomName}`

### 3. Monitor Browser Console
When testing streams, check browser console for:
- `👤 Viewer joined: viewer-{uuid}` (should appear for broadcaster)
- `📶 Connection quality changed` logs
- No unexpected disconnection messages
- Reconnection logs if network is interrupted

## Monitoring and Debugging

### Broadcaster Logs to Watch For
```
✅ Connected to LiveKit room: {roomName}
👤 Viewer joined: viewer-{uuid}
📤 Local track published: {trackName}
```

### Expected Behavior When Viewer Joins
```
Broadcaster console:
  👤 Viewer joined: viewer-abc123...
  [viewer count updates in UI]
  [stream continues without interruption]

Viewer console:
  🔌 Connecting to LiveKit room as viewer...
  ✅ Connected to room: {roomName}
  📥 Track subscribed from: host-{userId}
  🎥 Attaching video track to element
  ✅ Video track attached successfully
```

### Red Flags (Things That Should NOT Happen)
```
❌ 🔌 Room disconnected (when viewer joins)
❌ Connection quality changed: poor (without network issues)
❌ Multiple "Creating broadcaster token" logs for same stream
❌ Failed to subscribe errors
```

## Technical Details

### Why Stale Closures Were the Problem

When using `setTimeout` or event handlers with closure variables:
```typescript
let connectedRoom = newRoom;
setTimeout(() => {
  // This 'connectedRoom' might be stale if component re-rendered
  setViewerCount(connectedRoom.remoteParticipants.size);
}, 100);
```

If the component re-renders between when the timeout is set and when it fires, `connectedRoom` might reference a disconnected room instance.

**Solution:** Use the room instance from the current scope (`newRoom`) which is guaranteed to be the correct instance:
```typescript
requestAnimationFrame(() => {
  if (mounted && newRoom) {
    setViewerCount(newRoom.remoteParticipants.size);
  }
});
```

### Why Identity Simplification Helps

LiveKit uses participant identity as a unique key. If two tokens have the same identity trying to join the same room:
- The second connection will REPLACE the first one
- The first connection will be kicked out

By making broadcaster identity simpler (`host-{userId}`) and ensuring it's truly unique, we prevent accidental collisions.

## Prevention Strategies

To prevent this issue from recurring:

1. **Always use the room instance from the current scope** in event handlers
2. **Avoid closure variables** that might become stale
3. **Use `requestAnimationFrame`** instead of `setTimeout` for state updates
4. **Keep identities simple and unique**
5. **Add comprehensive logging** for connection events
6. **Monitor connection quality** and warn users
7. **Test with multiple viewers** joining simultaneously

## Success Criteria

The fix is successful when:
1. ✅ Broadcaster stream stays connected when viewers join
2. ✅ Viewer count updates correctly
3. ✅ Multiple viewers can watch simultaneously
4. ✅ Viewers can join and leave without affecting the stream
5. ✅ Connection quality issues are visible and handled
6. ✅ Automatic reconnection works properly
7. ✅ No unexpected disconnections in logs

## Related Documentation

- [VIEWER_STREAM_FIX.md](./VIEWER_STREAM_FIX.md) - Previous viewer visibility fixes
- [INSTANT_STREAM_VIEWER_FIX.md](./INSTANT_STREAM_VIEWER_FIX.md) - Anonymous viewer support
- [LIVEKIT_SETUP.md](./LIVEKIT_SETUP.md) - LiveKit integration guide

## Troubleshooting

### Issue: Stream still disconnects when viewer joins

**Check:**
1. Browser console for disconnect reason
2. Edge function logs for token creation
3. LiveKit dashboard for room activity
4. Network quality during disconnect

**Try:**
1. Clear browser cache
2. Redeploy edge function
3. Check LiveKit credentials
4. Test from different network

### Issue: Viewer count doesn't update

**Check:**
1. Browser console for ParticipantConnected events
2. Whether `mounted` flag is true
3. Room instance is not null

**Try:**
1. Refresh the page
2. Check for JavaScript errors
3. Verify room connection is stable

### Issue: Poor connection quality warnings

**Check:**
1. Network bandwidth
2. Firewall/VPN settings
3. WebRTC connectivity
4. LiveKit server region

**Try:**
1. Disable VPN
2. Use wired connection instead of WiFi
3. Close bandwidth-heavy applications
4. Test from different location

## Conclusion

This fix addresses the core issue of stream disconnection when viewers join by:
1. Eliminating stale closure bugs
2. Simplifying identity generation
3. Adding comprehensive monitoring
4. Providing better error visibility

The stream should now remain stable regardless of viewer activity.
