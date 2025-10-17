import { Room, RoomEvent, Track, LocalParticipant, RemoteParticipant } from 'livekit-client';

// LiveKit configuration
export const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL || 'wss://your-livekit-server.com';

export interface LiveKitTokenRequest {
  roomName: string;
  participantName: string;
  participantIdentity: string;
  metadata?: string;
}

/**
 * Create a new LiveKit room and connect to it
 */
export async function createLiveKitRoom(token: string): Promise<Room> {
  const room = new Room({
    adaptiveStream: true,
    dynacast: true,
    videoCaptureDefaults: {
      resolution: {
        width: 1920,
        height: 1080,
        frameRate: 30,
      },
    },
    audioCaptureDefaults: {
      autoGainControl: true,
      echoCancellation: true,
      noiseSuppression: true,
    },
  });

  await room.connect(LIVEKIT_URL, token);
  return room;
}

/**
 * Publish camera and microphone to the room
 */
export async function publishCameraAndMicrophone(room: Room): Promise<void> {
  // Enable camera
  await room.localParticipant.setCameraEnabled(true);
  
  // Enable microphone
  await room.localParticipant.setMicrophoneEnabled(true);
}

/**
 * Toggle camera on/off
 */
export async function toggleCamera(room: Room, enabled: boolean): Promise<void> {
  await room.localParticipant.setCameraEnabled(enabled);
}

/**
 * Toggle microphone on/off
 */
export async function toggleMicrophone(room: Room, enabled: boolean): Promise<void> {
  await room.localParticipant.setMicrophoneEnabled(enabled);
}

/**
 * Disconnect from room and cleanup
 */
export async function disconnectFromRoom(room: Room): Promise<void> {
  await room.disconnect();
}

/**
 * Setup audio level monitoring for visualization
 */
export function setupAudioLevelMonitoring(
  room: Room,
  onLevelChange: (level: number) => void
): () => void {
  // Monitor audio levels using Web Audio API
  const interval = setInterval(() => {
    const audioPublication = Array.from(room.localParticipant.audioTrackPublications.values())[0];
    if (audioPublication?.track) {
      // Get audio level (0-100)
      const level = Math.random() * 100; // Placeholder - actual implementation would use Web Audio API
      onLevelChange(level);
    }
  }, 100);

  return () => {
    clearInterval(interval);
  };
}

/**
 * Get room metadata
 */
export function getRoomMetadata(room: Room): {
  name: string;
  numParticipants: number;
  localParticipant: LocalParticipant;
} {
  return {
    name: room.name,
    numParticipants: room.remoteParticipants.size + 1, // +1 for local participant
    localParticipant: room.localParticipant,
  };
}
