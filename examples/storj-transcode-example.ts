/**
 * Storj Transcode Example
 * 
 * This file demonstrates how to use the Storj transcoding functionality
 * with Livepeer in different scenarios.
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// Example 1: Basic Transcode (file already uploaded to Storj)
// ============================================================================

export async function basicTranscodeExample() {
  const { data, error } = await supabase.functions.invoke('livepeer-transcode', {
    body: {
      action: 'create',
      inputPath: '/video/source.mp4',
      outputHlsPath: '/transcoded/hls',
      outputMp4Path: '/transcoded/mp4',
      profiles: [
        {
          name: '1080p',
          bitrate: 6000000,
          fps: 30,
          width: 1920,
          height: 1080
        },
        {
          name: '720p',
          bitrate: 3000000,
          fps: 30,
          width: 1280,
          height: 720
        }
      ]
    }
  });

  if (error) {
    console.error('Transcode error:', error);
    return;
  }

  console.log('Task ID:', data.taskId);
  return data.taskId;
}

// ============================================================================
// Example 2: Check Transcode Status
// ============================================================================

export async function checkTranscodeStatus(taskId: string) {
  const { data, error } = await supabase.functions.invoke('livepeer-transcode', {
    body: {
      action: 'status',
      taskId
    }
  });

  if (error) {
    console.error('Status check error:', error);
    return;
  }

  console.log('Status:', data.status.phase);
  console.log('Progress:', data.status.progress);
  
  if (data.status.phase === 'completed') {
    console.log('HLS Path:', data.output?.hls?.path);
    console.log('MP4 Path:', data.output?.mp4?.path);
  }

  return data;
}

// ============================================================================
// Example 3: Poll for Completion
// ============================================================================

export async function pollTranscodeCompletion(
  taskId: string,
  onProgress?: (progress: number) => void
): Promise<{ status: string; storjUrl?: string; ipfsCid?: string }> {
  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('livepeer-transcode', {
          body: {
            action: 'status',
            taskId
          }
        });

        if (error) throw error;

        if (data.status.progress !== undefined && onProgress) {
          onProgress(data.status.progress);
        }

        if (data.status.phase === 'completed') {
          clearInterval(interval);
          resolve(data);
        } else if (data.status.phase === 'failed') {
          clearInterval(interval);
          reject(new Error(data.status.errorMessage || 'Transcode failed'));
        }
      } catch (err) {
        clearInterval(interval);
        reject(err);
      }
    }, 5000); // Poll every 5 seconds
  });
}

// ============================================================================
// Example 4: Upload and Transcode Workflow
// ============================================================================

export async function uploadAndTranscodeWorkflow(file: File) {
  try {
    // Step 1: Generate upload URL
    const { data: uploadConfig, error: uploadError } = await supabase.functions.invoke('storj-upload', {
      body: {
        action: 'generate-upload-url',
        filename: file.name,
        contentType: file.type
      }
    });

    if (uploadError) throw uploadError;

    // Step 2: Upload file
    const uploadResponse = await fetch(uploadConfig.uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type
      },
      body: file
    });

    if (!uploadResponse.ok) {
      throw new Error('Upload failed');
    }

    console.log('File uploaded to:', uploadConfig.path);

    // Step 3: Start transcode
    const { data: transcodeData, error: transcodeError } = await supabase.functions.invoke('livepeer-transcode', {
      body: {
        action: 'create',
        inputPath: uploadConfig.path,
        profiles: [
          { name: '1080p', bitrate: 6000000, fps: 30, width: 1920, height: 1080 },
          { name: '720p', bitrate: 3000000, fps: 30, width: 1280, height: 720 },
          { name: '480p', bitrate: 1000000, fps: 30, width: 854, height: 480 },
          { name: '360p', bitrate: 500000, fps: 30, width: 640, height: 360 }
        ]
      }
    });

    if (transcodeError) throw transcodeError;

    console.log('Transcode started. Task ID:', transcodeData.taskId);

    // Step 4: Wait for completion
    const result = await pollTranscodeCompletion(transcodeData.taskId, (progress) => {
      console.log(`Transcode progress: ${Math.round(progress * 100)}%`);
    });

    console.log('Transcode complete!');
    console.log('HLS Path:', result.output?.hls?.path);
    console.log('MP4 Path:', result.output?.mp4?.path);

    return result;
  } catch (error) {
    console.error('Workflow error:', error);
    throw error;
  }
}

// ============================================================================
// Example 5: List All Transcode Tasks
// ============================================================================

export async function listTranscodeTasks() {
  const { data, error } = await supabase.functions.invoke('livepeer-transcode', {
    body: {
      action: 'list'
    }
  });

  if (error) {
    console.error('List error:', error);
    return;
  }

  console.log('Transcode tasks:', data);
  return data;
}

// ============================================================================
// Example 6: Generate Playback URLs
// ============================================================================

export function generatePlaybackUrls(hlsPath: string, storjSharePath: string) {
  // Construct the Storj playback URL
  const storjUrl = `https://link.storjshare.io/${storjSharePath}${hlsPath}/index.m3u8`;
  
  // Construct the Livepeer player URL
  const playerUrl = `https://lvpr.tv/?url=${encodeURIComponent(storjUrl)}`;

  return {
    storjUrl,
    playerUrl,
    embedUrl: `https://lvpr.tv/embed?url=${encodeURIComponent(storjUrl)}`
  };
}

// ============================================================================
// Example 7: Custom Profiles
// ============================================================================

export async function transcodeWithCustomProfiles(inputPath: string) {
  const customProfiles = [
    {
      name: '4K',
      bitrate: 16000000,
      fps: 60,
      width: 3840,
      height: 2160
    },
    {
      name: '1440p',
      bitrate: 8000000,
      fps: 60,
      width: 2560,
      height: 1440
    },
    {
      name: '1080p60',
      bitrate: 6000000,
      fps: 60,
      width: 1920,
      height: 1080
    }
  ];

  const { data, error } = await supabase.functions.invoke('livepeer-transcode', {
    body: {
      action: 'create',
      inputPath,
      profiles: customProfiles
    }
  });

  if (error) {
    console.error('Transcode error:', error);
    return;
  }

  return data;
}

// ============================================================================
// Example 8: Batch Transcode Multiple Files
// ============================================================================

export async function batchTranscode(inputPaths: string[]) {
  const tasks = await Promise.all(
    inputPaths.map(async (path) => {
      const { data, error } = await supabase.functions.invoke('livepeer-transcode', {
        body: {
          action: 'create',
          inputPath: path
        }
      });

      if (error) {
        console.error(`Error transcoding ${path}:`, error);
        return null;
      }

      return data;
    })
  );

  const validTasks = tasks.filter(task => task !== null);
  console.log(`Started ${validTasks.length} transcode tasks`);

  // Wait for all to complete
  const results = await Promise.all(
    validTasks.map(task => 
      pollTranscodeCompletion(task!.taskId)
    )
  );

  return results;
}

// ============================================================================
// Example 9: Error Handling
// ============================================================================

export async function transcodeWithErrorHandling(inputPath: string) {
  try {
    const { data, error } = await supabase.functions.invoke('livepeer-transcode', {
      body: {
        action: 'create',
        inputPath
      }
    });

    if (error) {
      if (error.message.includes('credentials')) {
        throw new Error('Storj credentials are not configured properly');
      } else if (error.message.includes('not found')) {
        throw new Error(`Video file not found at ${inputPath}`);
      } else {
        throw error;
      }
    }

    const result = await pollTranscodeCompletion(data.taskId);
    return result;
  } catch (error) {
    console.error('Transcode failed:', error);
    
    // Log to error tracking service
    // logError(error);
    
    // Show user-friendly message
    if (error instanceof Error) {
      return { error: error.message };
    }
    
    return { error: 'An unexpected error occurred' };
  }
}

// ============================================================================
// Usage
// ============================================================================

/*
// Basic usage
const taskId = await basicTranscodeExample();
const status = await checkTranscodeStatus(taskId);

// Upload and transcode
const file = // ... get file from input
const result = await uploadAndTranscodeWorkflow(file);

// Generate playback URLs
const urls = generatePlaybackUrls(
  result.output.hls.path,
  'your-storj-share-path'
);
console.log('Play at:', urls.playerUrl);
*/
