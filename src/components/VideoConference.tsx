import { useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, Track, RemoteTrackPublication, RemoteParticipant, LocalParticipant } from 'livekit-client';
import { createLiveKitRoom } from '@/lib/livekit-config';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, Video as VideoIcon, VideoOff, MonitorUp, PhoneOff, Users, Maximize2, Minimize2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { TipButton } from '@/components/TipButton';
import SoundCloudWidget from '@/components/SoundCloudWidget';
import { ScrollArea } from '@/components/ui/scroll-area';

interface VideoConferenceProps {
  roomToken: string;
  roomName: string;
  displayName: string;
  soundcloudUrl?: string;
  onLeave: () => void;
}

interface ParticipantVideo {
  participantId: string;
  name: string;
  videoElement: HTMLVideoElement;
  isLocal: boolean;
}

interface ParticipantProfile {
  id: string;
  username: string;
  display_name: string | null;
  wallet_address: string | null;
}

const VideoConference = ({ roomToken, roomName, displayName, soundcloudUrl, onLeave }: VideoConferenceProps) => {
  const { toast } = useToast();
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [participants, setParticipants] = useState<ParticipantVideo[]>([]);
  const [participantProfiles, setParticipantProfiles] = useState<Record<string, ParticipantProfile>>({});
  const [error, setError] = useState<string | null>(null);
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const expandedVideoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    let currentRoom: Room | null = null;

    const connectToRoom = async () => {
      try {
        setIsConnecting(true);
        setError(null);

        const newRoom = await createLiveKitRoom(roomToken);
        
        if (!isMounted) {
          await newRoom.disconnect();
          return;
        }

        currentRoom = newRoom;
        setRoom(newRoom);

        // Enable camera and microphone
        await newRoom.localParticipant.setCameraEnabled(true);
        await newRoom.localParticipant.setMicrophoneEnabled(true);

        // Handle local video
        const videoTrack = newRoom.localParticipant.videoTrackPublications.values().next().value?.track;
        if (videoTrack && localVideoRef.current) {
          videoTrack.attach(localVideoRef.current);
        }

        // Set up event listeners
        newRoom.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
        newRoom.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
        newRoom.on(RoomEvent.ParticipantConnected, handleParticipantConnected);
        newRoom.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
        newRoom.on(RoomEvent.Disconnected, handleDisconnected);
        newRoom.on(RoomEvent.LocalTrackPublished, handleLocalTrackPublished);

        // Add existing remote participants
        newRoom.remoteParticipants.forEach((participant) => {
          participant.trackPublications.forEach((publication) => {
            if (publication.track) {
              handleTrackSubscribed(publication.track, publication, participant);
            }
          });
        });

        setIsConnecting(false);
        
        toast({
          title: 'Connected',
          description: `Joined room: ${roomName}`,
        });
      } catch (err) {
        console.error('Failed to connect to room:', err);
        setError(err instanceof Error ? err.message : 'Failed to connect');
        setIsConnecting(false);
        
        toast({
          title: 'Connection failed',
          description: 'Could not connect to the meeting',
          variant: 'destructive',
        });
      }
    };

    const handleTrackSubscribed = (
      track: Track,
      publication: RemoteTrackPublication,
      participant: RemoteParticipant
    ) => {
      if (track.kind === Track.Kind.Video) {
        const videoElement = track.attach() as HTMLVideoElement;
        videoElement.className = 'w-full h-full object-cover rounded-lg';
        
        setParticipants((prev) => [
          ...prev.filter(p => p.participantId !== participant.identity),
          {
            participantId: participant.identity,
            name: participant.name || participant.identity,
            videoElement,
            isLocal: false,
          },
        ]);
      }
    };

    const handleTrackUnsubscribed = (
      track: Track,
      publication: RemoteTrackPublication,
      participant: RemoteParticipant
    ) => {
      if (track.kind === Track.Kind.Video) {
        track.detach();
        setParticipants((prev) => prev.filter(p => p.participantId !== participant.identity));
      }
    };

    const handleParticipantConnected = async (participant: RemoteParticipant) => {
      console.log('Participant connected:', participant.identity);
      
      // Fetch participant profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, username, display_name, wallet_address')
        .eq('username', participant.name || participant.identity)
        .single();
      
      if (profile) {
        setParticipantProfiles(prev => ({
          ...prev,
          [participant.identity]: profile
        }));
      }
      
      toast({
        title: 'Participant joined',
        description: participant.name || participant.identity,
      });
    };

    const handleParticipantDisconnected = (participant: RemoteParticipant) => {
      console.log('Participant disconnected:', participant.identity);
      setParticipants((prev) => prev.filter(p => p.participantId !== participant.identity));
      
      toast({
        title: 'Participant left',
        description: participant.name || participant.identity,
      });
    };

    const handleDisconnected = () => {
      console.log('Disconnected from room');
      setRoom(null);
    };

    const handleLocalTrackPublished = () => {
      if (currentRoom && localVideoRef.current) {
        const videoTrack = currentRoom.localParticipant.videoTrackPublications.values().next().value?.track;
        if (videoTrack) {
          videoTrack.attach(localVideoRef.current);
        }
      }
    };

    connectToRoom();

    return () => {
      isMounted = false;
      if (currentRoom) {
        currentRoom.disconnect();
      }
    };
  }, [roomToken, roomName]);

  useEffect(() => {
    if (!videoContainerRef.current) return;

    // Clear container
    videoContainerRef.current.innerHTML = '';

    // Add participant videos
    participants.forEach((participant) => {
      if (videoContainerRef.current && participant.videoElement.parentElement !== videoContainerRef.current) {
        const wrapper = document.createElement('div');
        wrapper.className = 'relative aspect-video bg-muted rounded-lg overflow-hidden group';
        
        const nameLabel = document.createElement('div');
        nameLabel.className = 'absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-sm z-10';
        nameLabel.textContent = participant.name;
        
        const expandBtn = document.createElement('button');
        expandBtn.className = 'absolute top-2 right-2 bg-black/70 text-white p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10';
        expandBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>';
        expandBtn.onclick = () => setExpandedVideo(participant.participantId);
        
        wrapper.appendChild(participant.videoElement);
        wrapper.appendChild(nameLabel);
        wrapper.appendChild(expandBtn);
        videoContainerRef.current.appendChild(wrapper);
      }
    });
  }, [participants]);

  // Handle expanded video display
  useEffect(() => {
    if (!expandedVideoRef.current || !expandedVideo || expandedVideo === 'local') return;

    const participant = participants.find(p => p.participantId === expandedVideo);
    if (!participant) return;

    // Clear and append the video element
    expandedVideoRef.current.innerHTML = '';
    participant.videoElement.className = 'w-full h-full object-contain';
    expandedVideoRef.current.appendChild(participant.videoElement);

    return () => {
      // Clean up on unmount or change
      if (participant.videoElement.parentElement === expandedVideoRef.current) {
        expandedVideoRef.current?.removeChild(participant.videoElement);
      }
    };
  }, [expandedVideo, participants]);

  const handleToggleCamera = async () => {
    if (!room) return;
    try {
      await room.localParticipant.setCameraEnabled(!isCameraEnabled);
      setIsCameraEnabled(!isCameraEnabled);
    } catch (err) {
      console.error('Error toggling camera:', err);
    }
  };

  const handleToggleMic = async () => {
    if (!room) return;
    try {
      await room.localParticipant.setMicrophoneEnabled(!isMicEnabled);
      setIsMicEnabled(!isMicEnabled);
    } catch (err) {
      console.error('Error toggling microphone:', err);
    }
  };

  const handleToggleScreenShare = async () => {
    if (!room) return;
    try {
      await room.localParticipant.setScreenShareEnabled(!isScreenSharing);
      setIsScreenSharing(!isScreenSharing);
      
      toast({
        title: isScreenSharing ? 'Screen sharing stopped' : 'Screen sharing started',
      });
    } catch (err) {
      console.error('Error toggling screen share:', err);
      toast({
        title: 'Screen share failed',
        description: 'Could not start screen sharing',
        variant: 'destructive',
      });
    }
  };

  const handleLeaveRoom = async () => {
    if (room) {
      await room.disconnect();
    }
    onLeave();
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6 max-w-md">
          <h2 className="text-xl font-bold text-destructive mb-2">Connection Error</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={onLeave} variant="outline">
            Back to Lobby
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b bg-card">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-semibold">{roomName}</h1>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {participants.length + 1}
              </Badge>
            </div>
            {isConnecting && (
              <Badge variant="outline">Connecting...</Badge>
            )}
          </div>
        </div>

        {/* Video Grid */}
        <div className="flex-1 overflow-hidden px-4 py-6">
          {expandedVideo ? (
            // Expanded single video view
            <div className="h-full flex flex-col max-w-7xl mx-auto">
              <div className="flex-1 relative bg-black rounded-lg overflow-hidden min-h-0">
                {expandedVideo === 'local' ? (
                  <>
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute bottom-4 left-4 bg-black/80 text-white px-3 py-2 rounded text-base z-10">
                      {displayName} (You)
                    </div>
                    {!isCameraEnabled && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black">
                        <VideoOff className="h-16 w-16 text-muted-foreground" />
                      </div>
                    )}
                  </>
                ) : (
                  participants
                    .filter(p => p.participantId === expandedVideo)
                    .map(participant => {
                      const profile = participantProfiles[participant.participantId];
                      return (
                        <div key={participant.participantId} className="w-full h-full relative">
                          <div ref={expandedVideoRef} className="w-full h-full" />
                          <div className="absolute bottom-4 left-4 bg-black/80 text-white px-3 py-2 rounded text-base z-10 flex items-center gap-3">
                            <span>{participant.name}</span>
                            {profile && profile.wallet_address && (
                              <TipButton
                                recipientUserId={profile.id}
                                recipientWalletAddress={profile.wallet_address}
                                recipientUsername={profile.username}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })
                )}
                <Button
                  onClick={() => setExpandedVideo(null)}
                  variant="secondary"
                  size="lg"
                  className="absolute top-4 right-4 z-20"
                >
                  <Minimize2 className="h-5 w-5 mr-2" />
                  Exit
                </Button>
              </div>
              
              {/* Thumbnail strip */}
              <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                <button
                  onClick={() => setExpandedVideo('local')}
                  className={`relative flex-shrink-0 w-32 h-20 rounded overflow-hidden border-2 ${expandedVideo === 'local' ? 'border-primary' : 'border-transparent'}`}
                >
                  <div className="w-full h-full bg-muted" />
                  <div className="absolute inset-x-0 bottom-0 bg-black/70 text-white text-xs px-1 py-0.5 truncate">
                    You
                  </div>
                </button>
                {participants.map(participant => (
                  <button
                    key={participant.participantId}
                    onClick={() => setExpandedVideo(participant.participantId)}
                    className={`relative flex-shrink-0 w-32 h-20 rounded overflow-hidden border-2 ${expandedVideo === participant.participantId ? 'border-primary' : 'border-transparent'}`}
                  >
                    <div className="w-full h-full bg-muted" />
                    <div className="absolute inset-x-0 bottom-0 bg-black/70 text-white text-xs px-1 py-0.5 truncate">
                      {participant.name}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // Grid view
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full max-w-7xl mx-auto">
              {/* Local Video */}
              <div className="relative aspect-video bg-muted rounded-lg overflow-hidden group">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-sm z-10">
                  {displayName} (You)
                </div>
                <Button
                  onClick={() => setExpandedVideo('local')}
                  variant="secondary"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
                {!isCameraEnabled && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted">
                    <VideoOff className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Remote Participants Container */}
              <div ref={videoContainerRef} className="contents" />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="border-t bg-card">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-center gap-2">
              <Button
                onClick={handleToggleMic}
                variant={isMicEnabled ? 'outline' : 'destructive'}
                size="lg"
                className="rounded-full w-14 h-14"
              >
                {isMicEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </Button>

              <Button
                onClick={handleToggleCamera}
                variant={isCameraEnabled ? 'outline' : 'destructive'}
                size="lg"
                className="rounded-full w-14 h-14"
              >
                {isCameraEnabled ? <VideoIcon className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </Button>

              <Button
                onClick={handleToggleScreenShare}
                variant={isScreenSharing ? 'default' : 'outline'}
                size="lg"
                className="rounded-full w-14 h-14"
              >
                <MonitorUp className="h-5 w-5" />
              </Button>

              <Button
                onClick={handleLeaveRoom}
                variant="destructive"
                size="lg"
                className="rounded-full w-14 h-14"
              >
                <PhoneOff className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-80 border-l bg-card flex flex-col max-h-screen">
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Participants List */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                Participants ({participants.length + 1})
              </h3>
              <div className="space-y-2">
                <Card className="p-3 bg-muted/50">
                  <div className="text-sm font-medium">{displayName} (You)</div>
                </Card>
                {participants.map((participant) => {
                  const profile = participantProfiles[participant.participantId];
                  return (
                    <Card key={participant.participantId} className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{participant.name}</div>
                          {profile && (
                            <div className="text-xs text-muted-foreground truncate">
                              @{profile.username}
                            </div>
                          )}
                        </div>
                        {profile && profile.wallet_address && (
                          <TipButton
                            recipientUserId={profile.id}
                            recipientWalletAddress={profile.wallet_address}
                            recipientUsername={profile.username}
                          />
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* SoundCloud Widget */}
            {soundcloudUrl && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Music</h3>
                <Card className="p-3">
                  <SoundCloudWidget url={soundcloudUrl} autoPlay={false} />
                </Card>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default VideoConference;
