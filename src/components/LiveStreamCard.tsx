import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Clock, Cloud, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface LiveStreamCardProps {
  stream: {
    id: string;
    title: string;
    description: string | null;
    viewer_count?: number;
    is_live?: boolean;
    thumbnail_url?: string | null;
    duration?: number;
    user_id?: string;
    profiles: {
      username: string;
      display_name: string | null;
      avatar_url: string | null;
    } | null;
  };
  isRecording?: boolean;
  isOwner?: boolean;
}

const LiveStreamCard = ({ stream, isRecording = false, isOwner = false }: LiveStreamCardProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSaveToStorj = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation
    
    setIsSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('save-to-storj', {
        body: { assetId: stream.id }
      });

      if (error) throw error;

      toast({
        title: "Saving to Storj",
        description: "Your recording is being saved to decentralized storage. This may take a few minutes.",
      });
    } catch (error) {
      console.error('Save to Storj error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save recording to Storj",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const thumbnailStyle = stream.thumbnail_url 
    ? { backgroundImage: `url(${stream.thumbnail_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {};

  return (
    <Card 
      className="border-0 shadow-card hover:shadow-glow transition-all cursor-pointer group"
      onClick={() => navigate(isRecording ? `/video/${stream.id}` : `/watch/${stream.id}`)}
    >
      <CardContent className="p-0">
        <div className="relative aspect-video bg-gradient-hero rounded-t-lg overflow-hidden" style={thumbnailStyle}>
          {!stream.thumbnail_url && (
            <div className="absolute inset-0 bg-gradient-glow opacity-40 group-hover:opacity-60 transition-opacity" />
          )}
          {stream.is_live && (
            <Badge className="absolute top-3 left-3 bg-red-500 text-white">
              ● LIVE
            </Badge>
          )}
          {isRecording && stream.duration && (
            <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-black/80 rounded px-2 py-1 text-sm text-white">
              <Clock className="w-4 h-4" />
              {formatDuration(stream.duration)}
            </div>
          )}
          {!isRecording && stream.viewer_count !== undefined && (
            <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/80 rounded px-2 py-1 text-sm text-white">
              <Eye className="w-4 h-4" />
              {stream.viewer_count}
            </div>
          )}
        </div>
        <div className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={stream.profiles?.avatar_url || undefined} />
              <AvatarFallback className="bg-gradient-hero text-primary-foreground">
                {stream.profiles?.display_name?.[0]?.toUpperCase() || "C"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm line-clamp-2 mb-1">{stream.title}</h3>
              <p className="text-sm text-muted-foreground">
                @{stream.profiles?.username || "Unknown"}
              </p>
            </div>
          </div>
          
          {/* Save to Storj button for recordings - only show to owner */}
          {isRecording && isOwner && (
            <div className="mt-3 pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleSaveToStorj}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Cloud className="w-4 h-4 mr-2" />
                    Save to Storj
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-1">
                Permanently store on decentralized storage
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default LiveStreamCard;
