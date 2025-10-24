import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Cloud, Plus, Upload, Loader2 } from "lucide-react";
import { uploadVideo } from "@/lib/fvm-config";
import { VIDEO_CATEGORIES, type VideoCategory } from "@/types/fvm";

// Note: Install lighthouse-web3 SDK: npm install @lighthouse-web3/sdk
// Add to .env: VITE_LIGHTHOUSE_API_KEY=your_api_key_here

export default function FVMUpload() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<VideoCategory>("Music");
  const [location, setLocation] = useState("");
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [thumbnailHash, setThumbnailHash] = useState("");
  const [videoHash, setVideoHash] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const thumbnailRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const uploadToLighthouse = async (file: File, type: "thumbnail" | "video") => {
    try {
      setIsUploading(true);
      
      // Import lighthouse dynamically
      const lighthouse = (await import("@lighthouse-web3/sdk")).default;
      
      const apiKey = import.meta.env.VITE_LIGHTHOUSE_API_KEY;
      
      if (!apiKey) {
        throw new Error("Lighthouse API key not found. Please add VITE_LIGHTHOUSE_API_KEY to your .env file");
      }

      // Upload to Lighthouse IPFS
      const output = await lighthouse.upload([file], apiKey);
      const cid = output.data.Hash;

      if (type === "thumbnail") {
        setThumbnailHash(cid);
      } else {
        setVideoHash(cid);
      }

      toast({
        title: "Upload Successful",
        description: `${type === "thumbnail" ? "Thumbnail" : "Video"} uploaded to IPFS: ${cid}`,
      });
      
      setIsUploading(false);
      return cid;
    } catch (error) {
      console.error("Error uploading to Lighthouse:", error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload file to IPFS",
        variant: "destructive",
      });
      setIsUploading(false);
      throw error;
    }
  };

  const handleThumbnailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setThumbnail(file);
      await uploadToLighthouse(file, "thumbnail");
    }
  };

  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setVideo(file);
      await uploadToLighthouse(file, "video");
    }
  };

  const handleSubmit = async () => {
    try {
      if (!title || !videoHash || !thumbnailHash) {
        toast({
          title: "Missing Information",
          description: "Please fill in all required fields and upload video and thumbnail",
          variant: "destructive",
        });
        return;
      }

      setIsUploading(true);

      const data = {
        videoHash,
        title,
        description,
        location,
        category,
        thumbnailHash,
      };

      await uploadVideo(data);

      toast({
        title: "Success!",
        description: "Video uploaded to blockchain successfully!",
      });

      // Reset form
      setTitle("");
      setDescription("");
      setCategory("Music");
      setLocation("");
      setThumbnail(null);
      setVideo(null);
      setThumbnailHash("");
      setVideoHash("");
    } catch (error) {
      console.error("Error uploading video:", error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload video to blockchain",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDiscard = () => {
    setTitle("");
    setDescription("");
    setCategory("Music");
    setLocation("");
    setThumbnail(null);
    setVideo(null);
    setThumbnailHash("");
    setVideoHash("");
  };

  return (
    <div className="w-full min-h-screen bg-background p-6">
      <Card className="max-w-6xl mx-auto">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-3xl">Upload Video to FVM</CardTitle>
              <CardDescription>
                Upload your video to Filecoin Virtual Machine with IPFS storage
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleDiscard} disabled={isUploading}>
                Discard
              </Button>
              <Button onClick={handleSubmit} disabled={isUploading || !videoHash || !thumbnailHash}>
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Cloud className="mr-2 h-4 w-4" />
                    Upload to Blockchain
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter video title..."
                  disabled={isUploading}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your video..."
                  rows={4}
                  disabled={isUploading}
                />
              </div>

              {/* Location and Category */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g., New York, USA"
                    disabled={isUploading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select value={category} onValueChange={(value) => setCategory(value as VideoCategory)} disabled={isUploading}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {VIDEO_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Thumbnail Upload */}
              <div className="space-y-2">
                <Label>Thumbnail *</Label>
                <div
                  onClick={() => !isUploading && thumbnailRef.current?.click()}
                  className="border-2 border-dashed rounded-lg p-4 h-48 flex items-center justify-center cursor-pointer hover:border-primary transition-colors"
                >
                  {thumbnail ? (
                    <img
                      src={URL.createObjectURL(thumbnail)}
                      alt="thumbnail preview"
                      className="h-full rounded-md object-cover"
                    />
                  ) : (
                    <div className="text-center">
                      <Plus className="mx-auto h-12 w-12 text-muted-foreground" />
                      <p className="mt-2 text-sm text-muted-foreground">Click to upload thumbnail</p>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  ref={thumbnailRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleThumbnailChange}
                  disabled={isUploading}
                />
                {thumbnailHash && (
                  <p className="text-xs text-muted-foreground">
                    IPFS Hash: {thumbnailHash}
                  </p>
                )}
              </div>
            </div>

            {/* Video Upload */}
            <div className="space-y-2">
              <Label>Video *</Label>
              <div
                onClick={() => !isUploading && videoRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-4 h-64 flex items-center justify-center cursor-pointer hover:border-primary transition-colors ${
                  video ? "" : ""
                }`}
              >
                {video ? (
                  <video
                    src={URL.createObjectURL(video)}
                    controls
                    className="h-full rounded-md"
                  />
                ) : (
                  <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">Click to upload video</p>
                  </div>
                )}
              </div>
              <input
                type="file"
                ref={videoRef}
                className="hidden"
                accept="video/*"
                onChange={handleVideoChange}
                disabled={isUploading}
              />
              {videoHash && (
                <p className="text-xs text-muted-foreground break-all">
                  IPFS Hash: {videoHash}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
