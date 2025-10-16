import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface LiveStreamCardProps {
  stream: {
    id: string;
    title: string;
    description: string | null;
    viewer_count: number;
    is_live: boolean;
    profiles: {
      username: string;
      display_name: string | null;
      avatar_url: string | null;
    };
  };
}

const LiveStreamCard = ({ stream }: LiveStreamCardProps) => {
  const navigate = useNavigate();

  return (
    <Card 
      className="border-0 shadow-card hover:shadow-glow transition-all cursor-pointer group"
      onClick={() => navigate(`/watch/${stream.id}`)}
    >
      <CardContent className="p-0">
        <div className="relative aspect-video bg-gradient-hero rounded-t-lg overflow-hidden">
          <div className="absolute inset-0 bg-gradient-glow opacity-40 group-hover:opacity-60 transition-opacity" />
          {stream.is_live && (
            <Badge className="absolute top-3 left-3 bg-red-500 text-white">
              ● LIVE
            </Badge>
          )}
          <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/60 rounded px-2 py-1 text-sm text-white">
            <Eye className="w-4 h-4" />
            {stream.viewer_count}
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={stream.profiles.avatar_url || undefined} />
              <AvatarFallback className="bg-gradient-hero text-primary-foreground">
                {stream.profiles.display_name?.[0]?.toUpperCase() || "C"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm line-clamp-2 mb-1">{stream.title}</h3>
              <p className="text-sm text-muted-foreground">
                @{stream.profiles.username}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LiveStreamCard;
