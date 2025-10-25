# Broadcast & Player Root Component Configuration

## Summary

Successfully configured the Broadcast.Root and Player.Root components with recommended props from the official Livepeer documentation to enhance streaming reliability, error handling, metrics tracking, and performance optimization.

---

## Changes Made

### 1. **Broadcast.Root Component Enhancements** (`InstantLiveStream.tsx`)

#### Added Props:

**✅ Error Handling (`onError`)**
- Implemented comprehensive error callback
- Displays error notifications to users
- Logs broadcast errors to console for debugging
- Auto-resolves error state when issues are fixed

**✅ Creator ID (`creatorId`)**
- Added creatorId prop for metrics and viewership API integration
- Passes user.id from parent component
- Enables Livepeer Studio to track broadcaster analytics

**✅ Timeout Configuration (`timeout`)**
- Set to 15000ms (15 seconds)
- Applies to SDP negotiation, WebRTC connection, and server responses
- Prevents indefinite hanging on connection issues

**✅ Video Constraints (`video`)**
- Configured MediaTrackConstraints for optimal bandwidth usage:
  - Max resolution: 1920x1080
  - Ideal resolution: 1920x1080
  - Max frame rate: 30fps
  - Ideal frame rate: 30fps
- Prevents excessive bandwidth consumption
- Ensures consistent quality across different devices

**✅ Hotkeys (`hotkeys`)**
- Enabled keyboard shortcuts for broadcast control
- Follows ARIA accessibility guidelines
- Improves user experience

#### Code Changes:

```typescript
// Added error state and handler
const [broadcastError, setBroadcastError] = useState<string | null>(null);

const handleBroadcastError = (error: any) => {
  if (error) {
    console.error('🚨 Broadcast error:', error);
    setBroadcastError(error.message);
    toast({
      title: 'Broadcast Error',
      description: error.message || 'An error occurred while broadcasting',
      variant: 'destructive',
    });
  } else {
    // Error resolved
    if (broadcastError) {
      console.log('✅ Broadcast error resolved');
      setBroadcastError(null);
    }
  }
};

// Enhanced Broadcast.Root configuration
<Broadcast.Root
  key={broadcastKey}
  ingestUrl={ingestUrl}
  aspectRatio={16/9}
  video={isVideoEnabled ? {
    width: {
      ideal: 1920,
      max: 1920,
    },
    height: {
      ideal: 1080,
      max: 1080,
    },
    frameRate: {
      ideal: 30,
      max: 30,
    },
  } : false}
  audio={isAudioEnabled}
  creatorId={creatorId}
  onError={handleBroadcastError}
  timeout={15000}
  hotkeys={true}
>
```

#### Error Display:

Added visual error feedback at the bottom of the component:

```typescript
{broadcastError && (
  <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
    <p className="text-sm text-destructive font-medium">
      ⚠️ {broadcastError}
    </p>
  </div>
)}
```

---

### 2. **Player.Root Component Enhancements** (`LiveStreamPlayer.tsx`)

#### Added Props:

**✅ Error Handling (`onError`)**
- Implemented playback error callback
- Shows user-friendly error messages
- Displays error UI in player area
- Logs playback errors to console

**✅ Viewer ID (`viewerId`)**
- Added viewerId prop for metrics tracking
- Passes user.id from parent components
- Enables Livepeer Studio to track viewer analytics

**✅ Timeout Configuration (`timeout`)**
- Set to 15000ms (15 seconds)
- Prevents indefinite loading states

**✅ Volume Control (`volume`)**
- Auto-muted (volume=0) for live streams to comply with browser autoplay policies
- Normal volume (volume=1) for VOD content
- Prevents autoplay failures in modern browsers

**✅ Low Latency (`lowLatency`)**
- Enabled for live streams (true)
- Disabled for VOD content (false)
- Optimizes playback mode based on content type

**✅ Hotkeys (`hotkeys`)**
- Enabled keyboard shortcuts for player control
- Follows ARIA accessibility guidelines

#### Code Changes:

```typescript
// Added error state and handler
const [playbackError, setPlaybackError] = useState<string | null>(null);
const { toast } = useToast();

const handlePlaybackError = (error: any) => {
  if (error) {
    console.error('🚨 Playback error:', error);
    setPlaybackError(error.message);
    toast({
      title: 'Playback Error',
      description: error.message || 'An error occurred during playback',
      variant: 'destructive',
    });
  } else {
    // Error resolved
    if (playbackError) {
      console.log('✅ Playback error resolved');
      setPlaybackError(null);
    }
  }
};

// Enhanced Player.Root configuration
<Player.Root 
  src={src} 
  autoPlay={isLive} 
  volume={isLive ? 0 : 1}
  lowLatency={isLive ? true : false}
  viewerId={viewerId}
  onError={handlePlaybackError}
  timeout={15000}
  hotkeys={true}
>
```

#### Error Display:

Added visual error feedback in player area:

```typescript
{playbackError ? (
  <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
    <AlertCircle className="w-12 h-12 text-destructive mb-4" />
    <p className="text-destructive font-medium mb-2">Playback Error</p>
    <p className="text-sm text-muted-foreground">{playbackError}</p>
  </div>
) : (
  // ... fallback UI
)}
```

---

### 3. **Parent Component Updates**

#### `Live.tsx`

Added creatorId and viewerId props:

```typescript
// Instant stream
<InstantLiveStream
  onStreamStart={(key) => setStreamKey(key)}
  onStreamEnd={handleEndStream}
  isLive={isLive}
  streamKey={streamKey}
  creatorId={user?.id}  // ✅ Added
/>

// Player
<LiveStreamPlayer 
  playbackId={playbackId}
  title={title}
  isLive={true}
  viewerId={user?.id}  // ✅ Added
/>
```

#### `Watch.tsx`

Added viewerId prop:

```typescript
<LiveStreamPlayer
  playbackId={stream.livepeer_playback_id}
  title={stream.title}
  isLive={stream.is_live}
  viewerId={currentUser?.id}  // ✅ Added
/>
```

---

## Benefits

### 🎯 Improved Reliability
- **Error Recovery**: Automatic error detection and user notification
- **Timeout Protection**: Prevents indefinite hanging on connection issues
- **Graceful Degradation**: Clear error messages guide users on next steps

### 📊 Enhanced Metrics
- **Creator Tracking**: Livepeer Studio can track broadcaster analytics
- **Viewer Tracking**: Livepeer Studio can track viewer engagement
- **Performance Monitoring**: Better insights into stream health

### ⚡ Performance Optimization
- **Bandwidth Control**: Video constraints prevent excessive data usage
- **Smart Volume**: Auto-mutes live streams to enable autoplay
- **Adaptive Latency**: Low-latency for live, standard for VOD

### 🔍 Better Debugging
- **Console Logging**: All errors logged with emoji prefixes for visibility
- **Error State Tracking**: Component state reflects error conditions
- **User Feedback**: Toast notifications keep users informed

### ♿ Accessibility
- **Keyboard Shortcuts**: Full keyboard control for both broadcast and playback
- **ARIA Compliance**: Follows accessibility best practices
- **Visual Feedback**: Clear error indicators and state changes

---

## Error Types Handled

According to Livepeer documentation, the following error types are handled:

1. **offline**: Stream is not active
2. **access-control**: Playback policy restrictions
3. **fallback**: Automatic fallback to alternative source
4. **permissions**: Camera/microphone access denied
5. **unknown**: Generic errors

All errors display:
- Console logs for developers
- Toast notifications for users
- Visual error indicators in UI
- Clear error messages

---

## Configuration Reference

### Broadcast.Root Props (Official Docs)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `ingestUrl` | string | - | WHIP WebRTC ingest URL |
| `aspectRatio` | number \| null | 16/9 | Aspect ratio container |
| `forceEnabled` | boolean | false | Auto-start after permissions |
| `audio` | boolean \| MediaTrackConstraints | true | Audio configuration |
| `video` | boolean \| MediaTrackConstraints | true | Video configuration |
| `hotkeys` | boolean | true | Keyboard shortcuts |
| `creatorId` | string | - | Creator ID for metrics |
| `onError` | function | - | Error callback |
| `timeout` | number | 10000 | Timeout in milliseconds |
| `storage` | Storage \| null | localStorage | Persistent state storage |

### Player.Root Props (Official Docs)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `src` | Src[] | - | Playback sources |
| `autoPlay` | boolean | false | Auto-play content |
| `volume` | number | 1 | Volume level (0-1) |
| `aspectRatio` | number \| null | 16/9 | Aspect ratio container |
| `hotkeys` | boolean | true | Keyboard shortcuts |
| `viewerId` | string | - | Viewer ID for metrics |
| `onError` | function | - | Error callback |
| `lowLatency` | boolean \| "force" | true | WebRTC low-latency mode |
| `timeout` | number | 10000 | Timeout in milliseconds |
| `storage` | Storage \| null | localStorage | Persistent state storage |

---

## Testing Checklist

### Broadcast Testing

- [x] Build succeeds without errors
- [ ] Camera preview appears correctly
- [ ] Video constraints limit resolution to 1080p max
- [ ] Error notifications appear for permissions denial
- [ ] Error notifications appear for connection failures
- [ ] Error state clears when issue is resolved
- [ ] Broadcast starts successfully with valid stream key
- [ ] creatorId is sent to Livepeer Studio
- [ ] Timeout triggers after 15 seconds of connection issues
- [ ] Keyboard shortcuts work (space to enable/disable, etc.)

### Player Testing

- [ ] Playback starts correctly for live streams
- [ ] Volume is muted (0) for live streams
- [ ] Volume is normal (1) for VOD content
- [ ] Low-latency mode enabled for live streams
- [ ] Error notifications appear for playback failures
- [ ] Error UI displays in player area
- [ ] Error state clears when issue is resolved
- [ ] viewerId is sent to Livepeer Studio
- [ ] Timeout triggers after 15 seconds of loading
- [ ] Keyboard shortcuts work (space to play/pause, etc.)

### Integration Testing

- [ ] Live.tsx passes creatorId to InstantLiveStream
- [ ] Live.tsx passes viewerId to LiveStreamPlayer
- [ ] Watch.tsx passes viewerId to LiveStreamPlayer
- [ ] All error messages are user-friendly
- [ ] Console logs help with debugging
- [ ] Toast notifications are not intrusive

---

## Next Steps (Optional Enhancements)

### 1. Storage Configuration
Consider implementing custom storage for broadcast settings:

```typescript
<Broadcast.Root
  storage={customStorage}  // Custom storage implementation
  // OR
  storage={null}  // Disable storage
>
```

### 2. Force Enabled Mode
For specific use cases, auto-start broadcasting:

```typescript
<Broadcast.Root
  forceEnabled={true}  // Start immediately after permissions
>
```

### 3. Custom Video Profiles
Add multiple video quality presets:

```typescript
const videoProfiles = {
  high: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
  medium: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
  low: { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 24 } },
};
```

### 4. Advanced Error Analytics
Track error patterns for monitoring:

```typescript
const handleBroadcastError = (error) => {
  // Log to analytics service
  analytics.track('broadcast_error', {
    type: error.type,
    message: error.message,
    userId: creatorId,
    timestamp: Date.now(),
  });
  
  // Existing error handling...
};
```

---

## Resources

- [Livepeer Broadcast.Root Docs](https://docs.livepeer.org/sdks/livepeer-js/Broadcast.Root)
- [Livepeer Player.Root Docs](https://docs.livepeer.org/sdks/livepeer-js/Player.Root)
- [WebRTC MediaTrackConstraints](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints)
- [WHIP/WHEP Spec](https://datatracker.ietf.org/doc/html/draft-ietf-wish-whip)

---

## Conclusion

The Broadcast.Root and Player.Root components are now fully configured with:

✅ Comprehensive error handling  
✅ Metrics tracking (creatorId/viewerId)  
✅ Performance optimization (video constraints, timeout)  
✅ Enhanced user experience (hotkeys, auto-mute)  
✅ Better debugging (console logs, error UI)  

All changes follow the official Livepeer documentation and best practices for production streaming applications.
