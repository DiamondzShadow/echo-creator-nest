import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import VideoConference from '@/components/VideoConference';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Video, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Meet = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [roomName, setRoomName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [joinedRoom, setJoinedRoom] = useState<string | null>(null);
  const [roomToken, setRoomToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const room = searchParams.get('room');
    if (room) {
      setRoomName(room);
    }
  }, [searchParams]);

  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 8);
  };

  const handleCreateRoom = async () => {
    const newRoomId = generateRoomId();
    setRoomName(newRoomId);
    navigate(`/meet?room=${newRoomId}`);
  };

  const handleJoinRoom = async () => {
    if (!roomName.trim()) {
      toast({
        title: 'Room name required',
        description: 'Please enter a room name',
        variant: 'destructive',
      });
      return;
    }

    if (!displayName.trim()) {
      toast({
        title: 'Display name required',
        description: 'Please enter your display name',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: 'Authentication required',
          description: 'Please sign in to join a meeting',
          variant: 'destructive',
        });
        navigate('/auth');
        return;
      }

      // Get viewer token for the conference room
      const { data, error } = await supabase.functions.invoke('livekit-token', {
        body: {
          roomName: `conference-${roomName}`,
          action: 'create_token',
        },
      });

      if (error) throw error;

      setRoomToken(data.token);
      setJoinedRoom(roomName);
      
      toast({
        title: 'Joined successfully',
        description: `Welcome to room: ${roomName}`,
      });
    } catch (error) {
      console.error('Error joining room:', error);
      toast({
        title: 'Failed to join',
        description: error instanceof Error ? error.message : 'Could not join the meeting',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveRoom = () => {
    setJoinedRoom(null);
    setRoomToken(null);
    setRoomName('');
    setDisplayName('');
    navigate('/meet');
  };

  if (joinedRoom && roomToken) {
    return (
      <div className="min-h-screen bg-background">
        <VideoConference
          roomToken={roomToken}
          roomName={joinedRoom}
          displayName={displayName}
          onLeave={handleLeaveRoom}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-primary/10 p-6">
                <Video className="h-12 w-12 text-primary" />
              </div>
            </div>
            <h1 className="text-4xl font-bold">Video Conferencing</h1>
            <p className="text-muted-foreground text-lg">
              Create or join a meeting room to connect with others
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Join a Meeting
              </CardTitle>
              <CardDescription>
                Enter a room name to join an existing meeting or create a new one
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Display Name</label>
                <Input
                  type="text"
                  placeholder="Enter your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Room Name</label>
                <Input
                  type="text"
                  placeholder="Enter room name or code"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleJoinRoom}
                  disabled={isLoading || !roomName.trim() || !displayName.trim()}
                  className="flex-1"
                >
                  {isLoading ? 'Joining...' : 'Join Room'}
                </Button>
                <Button
                  onClick={handleCreateRoom}
                  variant="outline"
                  className="flex-1"
                >
                  Create New Room
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Features:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Multi-participant video calls</li>
                  <li>Screen sharing capabilities</li>
                  <li>Real-time audio and video</li>
                  <li>Toggle camera and microphone</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Meet;
