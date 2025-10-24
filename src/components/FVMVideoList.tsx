import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, Video as VideoIcon } from "lucide-react";
import { getAllVideos } from "@/lib/fvm-config";
import { type FVMVideo } from "@/types/fvm";
import { VIDEO_CATEGORIES } from "@/types/fvm";
import FVMVideoCard from "./FVMVideoCard";

interface FVMVideoListProps {
  onVideoClick?: (video: FVMVideo) => void;
}

export default function FVMVideoList({ onVideoClick }: FVMVideoListProps) {
  const [videos, setVideos] = useState<FVMVideo[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<FVMVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const { toast } = useToast();

  useEffect(() => {
    fetchVideos();
  }, []);

  useEffect(() => {
    filterVideos();
  }, [videos, searchQuery, categoryFilter]);

  const fetchVideos = async () => {
    try {
      setIsLoading(true);
      const fetchedVideos = await getAllVideos();
      setVideos(fetchedVideos);
    } catch (error) {
      console.error("Error fetching videos:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch videos from blockchain",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterVideos = () => {
    let filtered = videos;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (video) =>
          video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          video.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by category
    if (categoryFilter !== "All") {
      filtered = filtered.filter((video) => video.category === categoryFilter);
    }

    setFilteredVideos(filtered);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading videos from blockchain...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <VideoIcon className="h-6 w-6" />
            FVM Video Library
          </CardTitle>
          <CardDescription>
            Decentralized videos stored on Filecoin Virtual Machine
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search videos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Categories</SelectItem>
                {VIDEO_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={fetchVideos} variant="outline">
              Refresh
            </Button>
          </div>

          {/* Video Grid */}
          {filteredVideos.length === 0 ? (
            <div className="text-center py-12">
              <VideoIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No videos found</h3>
              <p className="text-muted-foreground">
                {videos.length === 0
                  ? "Be the first to upload a video!"
                  : "Try adjusting your search or filters"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredVideos.map((video) => (
                <FVMVideoCard
                  key={video.id}
                  video={video}
                  onClick={() => onVideoClick?.(video)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
