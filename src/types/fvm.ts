// FVM Video Types

export interface FVMVideo {
  id: number;
  hash: string;
  title: string;
  description: string;
  location: string;
  category: string;
  thumbnailHash: string;
  date: string;
  author: string;
}

export interface VideoUploadData {
  videoHash: string;
  title: string;
  description: string;
  location: string;
  category: string;
  thumbnailHash: string;
}

export type VideoCategory =
  | "Music"
  | "Sports"
  | "Gaming"
  | "News"
  | "Entertainment"
  | "Education"
  | "Science & Technology"
  | "Travel"
  | "Other";

export const VIDEO_CATEGORIES: VideoCategory[] = [
  "Music",
  "Sports",
  "Gaming",
  "News",
  "Entertainment",
  "Education",
  "Science & Technology",
  "Travel",
  "Other",
];
