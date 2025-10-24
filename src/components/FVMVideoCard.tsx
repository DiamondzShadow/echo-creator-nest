import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import { type FVMVideo } from "@/types/fvm";
import { getIPFSUrl } from "@/lib/fvm-config";

interface FVMVideoCardProps {
  video: FVMVideo;
  horizontal?: boolean;
  onClick?: () => void;
}

export default function FVMVideoCard({ video, horizontal = false, onClick }: FVMVideoCardProps) {
  const thumbnailUrl = getIPFSUrl(video.thumbnailHash);
  const timeAgo = getTimeAgo(video.date);

  return (
    <Card 
      className={`cursor-pointer hover:shadow-lg transition-shadow ${
        horizontal ? "flex flex-row" : "flex flex-col"
      }`}
      onClick={onClick}
    >
      <img
        src={thumbnailUrl}
        alt={video.title}
        className={`object-cover ${
          horizontal 
            ? "w-60 rounded-l-lg" 
            : "w-full h-48 rounded-t-lg"
        }`}
        onError={(e) => {
          // Fallback to placeholder if image fails to load
          e.currentTarget.src = "/placeholder.svg";
        }}
      />
      <CardContent className={`p-4 ${horizontal ? "flex-1" : ""}`}>
        <h4 className="font-bold text-lg line-clamp-2 mb-2">{video.title}</h4>
        <div className="flex flex-col gap-1 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Badge variant="secondary">{video.category}</Badge>
            <span>•</span>
            <span>{timeAgo}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="truncate">
              {video.author.slice(0, 6)}...{video.author.slice(-4)}
            </span>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </div>
          {video.location && (
            <span className="text-xs">📍 {video.location}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}
