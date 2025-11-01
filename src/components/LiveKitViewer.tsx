import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import ReactionOverlay from '@/components/ReactionOverlay';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Volume2, VolumeX, Maximize, AlertCircle } from 'lucide-react';
import { Room, RoomEvent, Track, RemoteParticipant, RemoteVideoTrack, RemoteAudioTrack } from 'livekit-client';
import { createLiveKitRoom } from '@/lib/livekit-config';

interface LiveKitViewerProps {
  roomToken: string;
  title?: string;
  isLive?: boolean;
}

export const LiveKitViewer = ({ roomToken, title, isLive = false }: LiveKitViewerProps) => {
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasVideo, setHasVideo] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const { toast } = useToast();

  // Connect to LiveKit room as viewer
  useEffect(() => {
    if (!roomToken) return;

    let mounted = true;
    let connectedRoom: Room | null = null;
    let debugInterval: NodeJS.Timeout | null = null;

    const connect = async () => {
      try {
        console.log('🔌 Connecting to LiveKit room as viewer...');
        setIsConnecting(true);
        setError(null);

        // Create and connect to room
        const newRoom = await createLiveKitRoom(roomToken);
        connectedRoom = newRoom;

        if (!mounted) {
          await newRoom.disconnect();
          return;
        }

        setRoom(newRoom);
        setIsConnected(true);
        setIsConnecting(false);

        console.log('✅ Connected to room:', newRoom.name);
        console.log('📊 Room state:', {
          name: newRoom.name,
          state: newRoom.state,
          localParticipant: newRoom.localParticipant.identity,
          numRemoteParticipants: newRoom.remoteParticipants.size,
          metadata: newRoom.metadata,
        });
        
        // Log all available tracks every 2 seconds for debugging
        debugInterval = setInterval(() => {
          console.log('🔍 DEBUG - Current room state:', {
            remoteParticipants: newRoom.remoteParticipants.size,
            participants: Array.from(newRoom.remoteParticipants.values()).map(p => ({
              identity: p.identity,
              tracks: Array.from(p.trackPublications.values()).map(pub => ({
                name: pub.trackName,
                kind: pub.kind,
                subscribed: pub.isSubscribed,
                muted: pub.isMuted,
                enabled: pub.isEnabled,
              }))
            }))
          });
        }, 2000);

        // Setup room event handlers
        newRoom.on(RoomEvent.TrackSubscribed, async (
          track: RemoteVideoTrack | RemoteAudioTrack,
          publication,
          participant: RemoteParticipant
        ) => {
          console.log('📥 Track subscribed from:', participant.identity, 'kind:', track.kind, 'trackSid:', track.sid);
          
          if (track.kind === Track.Kind.Video && videoRef.current) {
            console.log('🎥 Attaching video track to element');
            console.log('Track details:', {
              sid: track.sid,
              muted: track.isMuted,
              mediaStreamTrack: track.mediaStreamTrack,
              readyState: track.mediaStreamTrack?.readyState,
              publicationEnabled: publication.isEnabled
            });
            
            try {
              const videoElement = videoRef.current;
              
              // Attach the track
              track.attach(videoElement);
              
              // Log video element state after attachment
              console.log('Video element after attach:', {
                srcObject: videoElement.srcObject,
                paused: videoElement.paused,
                readyState: videoElement.readyState,
                videoWidth: videoElement.videoWidth,
                videoHeight: videoElement.videoHeight
              });
              
              // Force play
              await videoElement.play();
              
              setHasVideo(true);
              console.log('✅ Video track attached and playing');
            } catch (err) {
              console.error('❌ Failed to attach/play video track:', err);
            }
          } else if (track.kind === Track.Kind.Audio && audioRef.current) {
            console.log('🔊 Attaching audio track to element');
            try {
              track.attach(audioRef.current);
              console.log('✅ Audio track attached successfully');
            } catch (err) {
              console.error('❌ Failed to attach audio track:', err);
            }
          }
        });

        newRoom.on(RoomEvent.TrackUnsubscribed, (track) => {
          console.log('📤 Track unsubscribed:', track.kind);
          track.detach();
          if (track.kind === Track.Kind.Video) {
            setHasVideo(false);
          }
        });

        // Listen for subscription status changes
        newRoom.on(RoomEvent.TrackSubscriptionStatusChanged, (publication, status, participant) => {
          console.log('🔄 Track subscription status changed:', {
            trackName: publication.trackName,
            kind: publication.kind,
            status,
            participant: participant.identity,
          });
          
          // If not subscribed, try to subscribe
          if (!publication.isSubscribed) {
            console.log('⚠️ Not subscribed, attempting to subscribe...');
            try {
              publication.setSubscribed(true);
            } catch (err) {
              console.error('❌ Subscription attempt failed:', err);
            }
          }
        });

        // Listen for track mute/unmute
        newRoom.on(RoomEvent.TrackMuted, (publication, participant) => {
          console.log('🔇 Track muted:', publication.trackName, 'by', participant.identity);
        });

        newRoom.on(RoomEvent.TrackUnmuted, (publication, participant) => {
          console.log('🔊 Track unmuted:', publication.trackName, 'by', participant.identity);
        });

        newRoom.on(RoomEvent.Disconnected, () => {
          console.log('🔌 Room disconnected');
          setIsConnected(false);
        });

        newRoom.on(RoomEvent.TrackPublished, (publication, participant: RemoteParticipant) => {
          console.log('📤 Track published by:', participant.identity, 'kind:', publication.kind, 'trackName:', publication.trackName);
          
          // CRITICAL FIX: Ensure we subscribe to newly published tracks
          if (!publication.isSubscribed) {
            console.log('🔄 Auto-subscribing to newly published track...');
            try {
              publication.setSubscribed(true);
            } catch (err) {
              console.error('❌ Failed to subscribe to newly published track:', err);
            }
          }
        });

        // Handle new participants joining
        newRoom.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
          console.log('👤 Participant connected:', participant.identity, 'Tracks:', participant.trackPublications.size);
          
          // Subscribe to their existing tracks
          participant.trackPublications.forEach((publication) => {
            console.log('📹 Checking track:', publication.trackName, 'subscribed:', publication.isSubscribed);
            if (publication.isSubscribed && publication.track) {
              if (publication.track.kind === Track.Kind.Video && videoRef.current) {
                console.log('🎥 Attaching video from new participant');
                (publication.track as RemoteVideoTrack).attach(videoRef.current);
                setHasVideo(true);
              } else if (publication.track.kind === Track.Kind.Audio && audioRef.current) {
                console.log('🔊 Attaching audio from new participant');
                (publication.track as RemoteAudioTrack).attach(audioRef.current);
              }
            } else if (!publication.isSubscribed) {
              // CRITICAL FIX: Subscribe to tracks that aren't auto-subscribed
              console.log('🔄 Subscribing to participant track...');
              try {
                publication.setSubscribed(true);
              } catch (err) {
                console.error('❌ Failed to subscribe:', err);
              }
            }
          });
        });

        // Check for existing tracks from remote participants already in room
        console.log('🔍 Checking for existing participants. Count:', newRoom.remoteParticipants.size);
        
        if (newRoom.remoteParticipants.size === 0) {
          console.log('⏳ No participants yet - waiting for broadcaster to join...');
        }
        
        newRoom.remoteParticipants.forEach((participant) => {
          console.log('👤 Found participant:', participant.identity, 'Tracks:', participant.trackPublications.size);
          participant.trackPublications.forEach(async (publication) => {
            console.log('📹 Track publication:', {
              trackName: publication.trackName,
              kind: publication.kind,
              subscribed: publication.isSubscribed,
              hasTrack: !!publication.track,
            });
            
            // CRITICAL: If track is already subscribed and available, attach it immediately
            if (publication.isSubscribed && publication.track) {
              console.log('🔄 Attaching existing subscribed track immediately');
              const track = publication.track;
              
              if (track.kind === Track.Kind.Video && videoRef.current) {
                console.log('🎥 Attaching existing video track to element');
                console.log('Existing track details:', {
                  sid: track.sid,
                  muted: track.isMuted,
                  mediaStreamTrack: track.mediaStreamTrack,
                  readyState: track.mediaStreamTrack?.readyState,
                  publicationEnabled: publication.isEnabled
                });
                
                try {
                  const videoElement = videoRef.current;
                  (track as RemoteVideoTrack).attach(videoElement);
                  
                  console.log('Video element after attach:', {
                    srcObject: videoElement.srcObject,
                    paused: videoElement.paused,
                    readyState: videoElement.readyState
                  });
                  
                  await videoElement.play();
                  
                  setHasVideo(true);
                  console.log('✅ Existing video track attached and playing!');
                } catch (err) {
                  console.error('❌ Failed to attach/play existing video track:', err);
                }
              } else if (track.kind === Track.Kind.Audio && audioRef.current) {
                console.log('🔊 Attaching existing audio track to element');
                try {
                  (track as RemoteAudioTrack).attach(audioRef.current);
                  console.log('✅ Existing audio track attached successfully!');
                } catch (err) {
                  console.error('❌ Failed to attach existing audio track:', err);
                }
              }
            } else if (!publication.isSubscribed) {
              // If not subscribed, explicitly subscribe
              console.log('⚠️ Track not subscribed yet, explicitly subscribing...');
              try {
                publication.setSubscribed(true);
              } catch (err) {
                console.error('❌ Failed to subscribe to track:', err);
              }
            }
          });
        });

      } catch (err) {
        console.error('❌ Failed to connect to LiveKit:', err);
        const errorMsg = err instanceof Error ? err.message : 'Failed to connect to stream';
        setError(errorMsg);
        setIsConnecting(false);
        
        toast({
          title: 'Connection failed',
          description: errorMsg,
          variant: 'destructive',
        });
      }
    };

    connect();

    // Cleanup
    return () => {
      mounted = false;
      console.log('🧹 Cleaning up viewer connection...');
      
      if (debugInterval) {
        clearInterval(debugInterval);
      }
      
      if (connectedRoom) {
        connectedRoom.disconnect();
      }
    };
  }, [roomToken]);

  // Handle mute toggle
  const handleMuteToggle = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Handle fullscreen
  const handleFullscreen = () => {
    if (videoRef.current) {
      videoRef.current.requestFullscreen();
    }
  };

  return (
    <Card className="border-0 shadow-glow bg-gradient-card overflow-hidden">
      <div className="relative">
        <div className="aspect-video bg-muted rounded-lg overflow-hidden relative">
          {isConnecting ? (
            <div className="w-full h-full flex flex-col items-center justify-center">
              <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">Connecting to stream...</p>
            </div>
          ) : error ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-8">
              <AlertCircle className="w-12 h-12 text-destructive mb-4" />
              <p className="text-destructive font-medium mb-2">Connection Error</p>
              <p className="text-sm text-muted-foreground text-center">{error}</p>
            </div>
          ) : isConnected ? (
            <div className="relative w-full h-full group">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <audio ref={audioRef} autoPlay muted={isMuted} />

              {/* Reactions overlay */}
              <ReactionOverlay />

              {/* Live indicator */}
              {isLive && (
                <div className="absolute top-4 left-4 z-10 bg-destructive text-destructive-foreground px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2 shadow-glow animate-pulse">
                  <span className="w-2 h-2 bg-destructive-foreground rounded-full animate-pulse"></span>
                  LIVE
                </div>
              )}

              {/* Controls overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={handleMuteToggle}
                    className="text-white hover:text-primary transition-colors"
                  >
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={handleFullscreen}
                    className="text-white hover:text-primary transition-colors"
                  >
                    <Maximize className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {!hasVideo && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <p className="text-muted-foreground">Waiting for video...</p>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-muted-foreground">Stream disconnected</p>
            </div>
          )}
        </div>
      </div>
      {title && (
        <div className="p-4">
          <h3 className="text-lg font-bold">{title}</h3>
        </div>
      )}
    </Card>
  );
};
