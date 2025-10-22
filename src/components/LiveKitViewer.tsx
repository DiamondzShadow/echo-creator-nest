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
  const [isMuted, setIsMuted] = useState(false);
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

        // Setup room event handlers
        newRoom.on(RoomEvent.TrackSubscribed, (
          track: RemoteVideoTrack | RemoteAudioTrack,
          publication,
          participant: RemoteParticipant
        ) => {
          console.log('📥 Track subscribed from:', participant.identity, 'kind:', track.kind, 'trackSid:', track.sid);
          
          if (track.kind === Track.Kind.Video && videoRef.current) {
            console.log('🎥 Attaching video track to element');
            try {
              track.attach(videoRef.current);
              setHasVideo(true);
              console.log('✅ Video track attached successfully');
            } catch (err) {
              console.error('❌ Failed to attach video track:', err);
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
          
          // If subscription failed, try again
          if (status === 'error' && !publication.isSubscribed) {
            console.log('⚠️ Subscription error, retrying...');
            setTimeout(() => {
              publication.setSubscribed(true).catch(err => {
                console.error('❌ Retry failed:', err);
              });
            }, 1000);
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
            publication.setSubscribed(true).catch((err) => {
              console.error('❌ Failed to subscribe to newly published track:', err);
            });
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
              publication.setSubscribed(true).catch((err) => {
                console.error('❌ Failed to subscribe:', err);
              });
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
          participant.trackPublications.forEach((publication) => {
            console.log('📹 Track publication:', {
              trackName: publication.trackName,
              kind: publication.kind,
              subscribed: publication.isSubscribed,
              hasTrack: !!publication.track,
            });
            
            if (publication.isSubscribed && publication.track) {
              if (publication.track.kind === Track.Kind.Video && videoRef.current) {
                console.log('🎥 Attaching existing video track');
                (publication.track as RemoteVideoTrack).attach(videoRef.current);
                setHasVideo(true);
              } else if (publication.track.kind === Track.Kind.Audio && audioRef.current) {
                console.log('🔊 Attaching existing audio track');
                (publication.track as RemoteAudioTrack).attach(audioRef.current);
              }
            } else if (!publication.isSubscribed) {
              // CRITICAL FIX: Explicitly subscribe to tracks that aren't auto-subscribed
              console.log('⚠️ Track not subscribed yet, explicitly subscribing...');
              publication.setSubscribed(true).catch((err) => {
                console.error('❌ Failed to subscribe to track:', err);
              });
            }
          });
        });

      } catch (err: any) {
        console.error('❌ Failed to connect to LiveKit:', err);
        setError(err.message || 'Failed to connect to stream');
        setIsConnecting(false);
        
        toast({
          title: 'Connection failed',
          description: err.message || 'Failed to connect to stream',
          variant: 'destructive',
        });
      }
    };

    connect();

    // Cleanup
    return () => {
      mounted = false;
      console.log('🧹 Cleaning up viewer connection...');
      
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
                className="w-full h-full object-cover"
              />
              <audio ref={audioRef} autoPlay />

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
