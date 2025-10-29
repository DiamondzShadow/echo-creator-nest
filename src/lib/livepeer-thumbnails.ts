/**
 * Livepeer Thumbnail Utilities
 * 
 * Livepeer generates multiple thumbnails for each video (one per segment, ~3 seconds).
 * This utility helps fetch and use these thumbnails for thumbnail scrubbing and preview images.
 */

export interface ThumbnailInfo {
  startTime: number;
  endTime: number;
  url: string;
  index: number;
}

export interface PlaybackInfo {
  type: string;
  meta: {
    source: Array<{
      hrn: string;
      type: string;
      url: string;
    }>;
  };
}

/**
 * Get the simple thumbnail URL for a video asset
 * This returns a single representative thumbnail
 */
export function getSimpleThumbnailUrl(playbackId: string): string {
  return `https://livepeer.studio/api/playback/${playbackId}/thumbnail.jpg`;
}

/**
 * Get a thumbnail at a specific time in the video
 * @param playbackId - The Livepeer playback ID
 * @param timeInSeconds - The time in seconds (e.g., 10 for 10 seconds into the video)
 */
export function getThumbnailAtTime(playbackId: string, timeInSeconds: number): string {
  return `https://livepeer.studio/api/playback/${playbackId}/thumbnail.jpg?time=${timeInSeconds}s`;
}

/**
 * Fetch playback info including thumbnail VTT file URL
 */
export async function getPlaybackInfo(playbackId: string): Promise<PlaybackInfo | null> {
  try {
    const response = await fetch(`https://livepeer.studio/api/playback/${playbackId}`);
    if (!response.ok) {
      console.error('Failed to fetch playback info:', response.statusText);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching playback info:', error);
    return null;
  }
}

/**
 * Get the WebVTT file URL for thumbnails
 * The VTT file contains all thumbnail URLs with timestamps
 */
export function getThumbnailsVttUrl(playbackInfo: PlaybackInfo): string | null {
  const thumbnailSource = playbackInfo.meta.source.find(
    (source) => source.hrn === 'Thumbnails' && source.type === 'text/vtt'
  );
  return thumbnailSource?.url || null;
}

/**
 * Parse WebVTT file to get thumbnail info
 */
export async function parseThumbnailsVtt(vttUrl: string): Promise<ThumbnailInfo[]> {
  try {
    const response = await fetch(vttUrl);
    if (!response.ok) {
      console.error('Failed to fetch VTT file:', response.statusText);
      return [];
    }
    
    const vttText = await response.text();
    const thumbnails: ThumbnailInfo[] = [];
    
    // Parse VTT format
    // Example:
    // 00:00:00.000 --> 00:00:10.000
    // keyframes_0.jpg
    const lines = vttText.split('\n');
    let currentTime: { start: number; end: number } | null = null;
    let index = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip WEBVTT header and empty lines
      if (!line || line.startsWith('WEBVTT')) continue;
      
      // Parse timestamp line (format: 00:00:00.000 --> 00:00:10.000)
      if (line.includes('-->')) {
        const [startStr, endStr] = line.split('-->').map(s => s.trim());
        currentTime = {
          start: parseVttTime(startStr),
          end: parseVttTime(endStr),
        };
      } else if (currentTime && line.endsWith('.jpg')) {
        // This is the thumbnail filename
        // Convert relative path to full URL
        const baseUrl = vttUrl.substring(0, vttUrl.lastIndexOf('/') + 1);
        thumbnails.push({
          startTime: currentTime.start,
          endTime: currentTime.end,
          url: baseUrl + line,
          index: index++,
        });
        currentTime = null;
      }
    }
    
    return thumbnails;
  } catch (error) {
    console.error('Error parsing VTT file:', error);
    return [];
  }
}

/**
 * Convert VTT time format (HH:MM:SS.mmm) to seconds
 */
function parseVttTime(timeStr: string): number {
  const parts = timeStr.split(':');
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parseFloat(parts[2]);
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Get thumbnail URL for a specific time in the video
 * Uses the VTT file to find the appropriate thumbnail
 */
export function getThumbnailForTime(
  thumbnails: ThumbnailInfo[],
  timeInSeconds: number
): string | null {
  const thumbnail = thumbnails.find(
    (t) => timeInSeconds >= t.startTime && timeInSeconds < t.endTime
  );
  return thumbnail?.url || null;
}

/**
 * Get the first frame thumbnail (useful for video previews)
 */
export function getFirstFrameThumbnail(vttUrl: string): string {
  // Get the base URL from the VTT URL
  // Example: https://vod-cdn.lp-playback.studio/.../thumbnails/thumbnails.vtt
  // Becomes: https://vod-cdn.lp-playback.studio/.../thumbnails/keyframes_0.jpg
  const baseUrl = vttUrl.replace('/thumbnails.vtt', '');
  return `${baseUrl}/keyframes_0.jpg`;
}

/**
 * Complete workflow to get thumbnails for a video
 * @param playbackId - The Livepeer playback ID
 * @returns Array of thumbnail info or null if failed
 */
export async function getVideoThumbnails(playbackId: string): Promise<ThumbnailInfo[] | null> {
  // 1. Get playback info
  const playbackInfo = await getPlaybackInfo(playbackId);
  if (!playbackInfo) return null;

  // 2. Get VTT URL
  const vttUrl = getThumbnailsVttUrl(playbackInfo);
  if (!vttUrl) return null;

  // 3. Parse VTT file
  const thumbnails = await parseThumbnailsVtt(vttUrl);
  return thumbnails;
}
