/**
 * TypeScript types for Livepeer Transcode API with Storj integration
 */

export interface TranscodeProfile {
  name: string;
  bitrate: number;
  fps: number;
  width: number;
  height: number;
}

export interface S3Credentials {
  accessKeyId: string;
  secretAccessKey: string;
}

export interface S3Input {
  type: 's3';
  endpoint: string;
  credentials: S3Credentials;
  bucket: string;
  path: string;
}

export interface S3Storage {
  type: 's3';
  endpoint: string;
  credentials: S3Credentials;
  bucket: string;
}

export interface TranscodeOutputs {
  hls?: {
    path: string;
  };
  mp4?: {
    path: string;
  };
}

export interface TranscodeRequest {
  input: S3Input;
  storage: S3Storage;
  outputs: TranscodeOutputs;
  profiles: TranscodeProfile[];
}

export interface TranscodeTaskStatus {
  phase: 'pending' | 'running' | 'completed' | 'failed';
  progress?: number;
  errorMessage?: string;
  updatedAt?: number;
}

export interface TranscodeTask {
  id: string;
  userId?: string;
  status: TranscodeTaskStatus;
  input?: S3Input;
  storage?: S3Storage;
  outputs?: TranscodeOutputs;
  profiles?: TranscodeProfile[];
  createdAt: number;
  updatedAt?: number;
}

export interface TranscodeCreateResponse {
  taskId: string;
  status: TranscodeTaskStatus;
  input?: S3Input;
  output?: TranscodeOutputs;
}

export interface TranscodeStatusResponse extends TranscodeTask {}

export interface TranscodeListResponse {
  data: TranscodeTask[];
  total: number;
}

// Edge function request types
export interface TranscodeEdgeFunctionRequest {
  action: 'create' | 'status' | 'list';
  taskId?: string;
  inputPath?: string;
  outputHlsPath?: string;
  outputMp4Path?: string;
  profiles?: TranscodeProfile[];
}

// Storj configuration
export interface StorjConfig {
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint?: string;
  sharePath?: string;
}

// Playback URL helpers
export const getStorjPlaybackUrl = (
  sharePath: string,
  hlsPath: string
): string => {
  const baseUrl = 'https://link.storjshare.io';
  return `${baseUrl}/${sharePath}${hlsPath}/index.m3u8`;
};

export const getLivepeerPlayerUrl = (playbackUrl: string): string => {
  return `https://lvpr.tv/?url=${encodeURIComponent(playbackUrl)}`;
};
