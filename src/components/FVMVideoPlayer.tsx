import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CheckCircle2, MapPin, Calendar } from "lucide-react";
import { type FVMVideo } from "@/types/fvm";
import { getIPFSUrl } from "@/lib/fvm-config";

interface FVMVideoPlayerProps {
  video: FVMVideo;
}

export default function FVMVideoPlayer({ video }: FVMVideoPlayerProps) {
  const videoUrl = getIPFSUrl(video.hash);
  const thumbnailUrl = getIPFSUrl(video.thumbnailHash);

  const formattedDate = new Date(video.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="w-full space-y-4">
      {/* Video Player */}
      <Card>
        <CardContent className="p-0">
          <video
            controls
            className="w-full aspect-video rounded-t-lg bg-black"
            poster={thumbnailUrl}
            preload="metadata"
          >
            <source src={videoUrl} type="video/mp4" />
            <source src={videoUrl} type="video/webm" />
            <source src={videoUrl} type="video/ogg" />
            Your browser does not support the video tag.
          </video>
        </CardContent>
      </Card>

      {/* Video Info */}
      <Card>
        <CardContent className="p-6 space-y-4">
          {/* Title and Category */}
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-2xl md:text-3xl font-bold capitalize">
                {video.title}
              </h1>
              <Badge variant="secondary" className="shrink-0">
                {video.category}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {video.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{video.location}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{formattedDate}</span>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t" />

          {/* Author Info */}
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {video.author.slice(2, 4).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <p className="font-medium">
                  {video.author.slice(0, 6)}...{video.author.slice(-4)}
                </p>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </div>
              <p className="text-sm text-muted-foreground">
                Creator • {video.author}
              </p>
            </div>
          </div>

          {/* Description */}
          {video.description && (
            <>
              <div className="border-t" />
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {video.description}
                </p>
              </div>
            </>
          )}

          {/* Technical Details */}
          <div className="border-t" />
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Technical Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div className="space-y-1 p-3 bg-secondary/50 rounded-lg">
                <p className="text-muted-foreground">Video IPFS Hash</p>
                <p className="font-mono break-all">{video.hash}</p>
              </div>
              <div className="space-y-1 p-3 bg-secondary/50 rounded-lg">
                <p className="text-muted-foreground">Thumbnail IPFS Hash</p>
                <p className="font-mono break-all">{video.thumbnailHash}</p>
              </div>
              <div className="space-y-1 p-3 bg-secondary/50 rounded-lg">
                <p className="text-muted-foreground">Video ID</p>
                <p className="font-mono">#{video.id}</p>
              </div>
              <div className="space-y-1 p-3 bg-secondary/50 rounded-lg">
                <p className="text-muted-foreground">Blockchain</p>
                <p className="font-mono">Filecoin (FVM)</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
