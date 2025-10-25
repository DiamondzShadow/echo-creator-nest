# Transcode Video with Storj

This guide describes how to use the Livepeer transcode API to transcode and store video files in Storj using Storj's S3 API.

## Overview

The Transcode API can be used with any S3-compatible storage provider. This implementation uses Storj for decentralized video storage with Livepeer's transcoding capabilities.

## Prerequisites

1. **Storj Account**: Create an account at [Storj](https://www.storj.io/)
2. **Livepeer Studio Account**: Create an account at [Livepeer Studio](https://livepeer.studio/)
3. **Storj S3 Credentials**: Generate S3-compatible credentials from your Storj account

## Setup

### 1. Generate Storj S3 Credentials

Follow the [Storj guide](https://docs.storj.io/dcs/api-reference/s3-compatible-gateway) for generating S3 credentials using either:
- The Storj web interface
- The uplink CLI

Ensure your credentials have proper read/write permissions for your bucket.

### 2. Configure Environment Variables

Add the following environment variables to your Supabase project:

```bash
LIVEPEER_API_KEY=your_livepeer_api_key
STORJ_ACCESS_KEY_ID=your_storj_access_key
STORJ_SECRET_ACCESS_KEY=your_storj_secret_key
STORJ_BUCKET=your_bucket_name
STORJ_ENDPOINT=https://gateway.storjshare.io
```

### 3. Upload Video to Storj

Upload your video file to Storj using one of these methods:

- **Storj Web Interface**: Navigate to your bucket and upload files
- **Storj Uplink CLI**: Use `uplink cp` command
- **S3 API Client**: Use any S3-compatible client library

## Usage

### Using the React Component

```tsx
import { StorjTranscode } from '@/components/StorjTranscode';

function App() {
  return <StorjTranscode />;
}
```

### Using the Edge Function Directly

#### Create Transcode Task

```typescript
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
      },
      {
        name: '480p',
        bitrate: 1000000,
        fps: 30,
        width: 854,
        height: 480
      },
      {
        name: '360p',
        bitrate: 500000,
        fps: 30,
        width: 640,
        height: 360
      }
    ]
  }
});

console.log('Task ID:', data.taskId);
```

#### Check Task Status

```typescript
const { data, error } = await supabase.functions.invoke('livepeer-transcode', {
  body: {
    action: 'status',
    taskId: 'your-task-id'
  }
});

console.log('Status:', data.status.phase);
console.log('Progress:', data.status.progress);
```

#### List All Tasks

```typescript
const { data, error } = await supabase.functions.invoke('livepeer-transcode', {
  body: {
    action: 'list'
  }
});

console.log('Tasks:', data);
```

## Playback from Storj

### 1. Create a Shared Storj URL

#### Using Uplink CLI

```bash
uplink share sj://your-bucket/ --url --not-after=none --base-url=https://link.storjshare.io
```

This will generate a URL like:
```
https://link.storjshare.io/jwjfgdxkvmfgngsgitii6pny62za/your-bucket
```

#### Using Web Interface

1. Navigate to "Buckets" in the Storj dashboard
2. Click "Share Bucket" button
3. Copy the generated URL

### 2. Construct Playback URL

For HLS playback, append the HLS output path and `index.m3u8`:

```
https://link.storjshare.io/jwjfgdxkvmfgngsgitii6pny62za/your-bucket/transcoded/hls/index.m3u8
```

### 3. Use with Livepeer Player

Play your video using the Livepeer embeddable player:

```
https://lvpr.tv/?url=https://link.storjshare.io/jwjfgdxkvmfgngsgitii6pny62za/your-bucket/transcoded/hls/index.m3u8
```

## API Parameters

### Create Action Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `action` | string | Yes | Must be "create" |
| `inputPath` | string | Yes | Path to source video in Storj bucket |
| `outputHlsPath` | string | No | Output path for HLS files |
| `outputMp4Path` | string | No | Output path for MP4 files |
| `profiles` | array | No | Transcode quality profiles |

### Transcode Profile

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Profile name (e.g., "1080p", "720p") |
| `bitrate` | number | Video bitrate in bps |
| `fps` | number | Frames per second |
| `width` | number | Video width in pixels |
| `height` | number | Video height in pixels |

### Task Status Phases

- `pending`: Task is queued
- `running`: Transcoding in progress
- `completed`: Transcoding finished successfully
- `failed`: Transcoding failed (check `errorMessage`)

## Code Examples

### Node.js Example

```javascript
import { Livepeer } from "livepeer";

const apiKey = "YOUR_API_KEY";
const livepeer = new Livepeer({ apiKey });

await livepeer.transcode.create({
  input: {
    type: "s3",
    endpoint: "https://gateway.storjshare.io",
    credentials: {
      accessKeyId: process.env.STORJ_ACCESS_KEY_ID,
      secretAccessKey: process.env.STORJ_SECRET_ACCESS_KEY
    },
    bucket: "mybucket",
    path: "/video/source.mp4"
  },
  storage: {
    type: "s3",
    endpoint: "https://gateway.storjshare.io",
    credentials: {
      accessKeyId: process.env.STORJ_ACCESS_KEY_ID,
      secretAccessKey: process.env.STORJ_SECRET_ACCESS_KEY
    },
    bucket: "mybucket"
  },
  outputs: {
    hls: {
      path: "/samplevideo/hls"
    },
    mp4: {
      path: "/samplevideo/mp4"
    }
  },
  profiles: [
    {
      name: "480p",
      bitrate: 1000000,
      fps: 30,
      width: 854,
      height: 480
    },
    {
      name: "360p",
      bitrate: 500000,
      fps: 30,
      width: 640,
      height: 360
    }
  ]
});
```

### Python Example

```python
from livepeer import Livepeer
import os

client = Livepeer(api_key=os.environ.get("LIVEPEER_API_KEY"))

task = client.transcode.create(
    input={
        "type": "s3",
        "endpoint": "https://gateway.storjshare.io",
        "credentials": {
            "access_key_id": os.environ.get("STORJ_ACCESS_KEY_ID"),
            "secret_access_key": os.environ.get("STORJ_SECRET_ACCESS_KEY")
        },
        "bucket": "mybucket",
        "path": "/video/source.mp4"
    },
    storage={
        "type": "s3",
        "endpoint": "https://gateway.storjshare.io",
        "credentials": {
            "access_key_id": os.environ.get("STORJ_ACCESS_KEY_ID"),
            "secret_access_key": os.environ.get("STORJ_SECRET_ACCESS_KEY")
        },
        "bucket": "mybucket"
    },
    outputs={
        "hls": {"path": "/samplevideo/hls"},
        "mp4": {"path": "/samplevideo/mp4"}
    },
    profiles=[
        {
            "name": "480p",
            "bitrate": 1000000,
            "fps": 30,
            "width": 854,
            "height": 480
        }
    ]
)

print(f"Task ID: {task.id}")
```

## Troubleshooting

### Common Issues

1. **Invalid Credentials**: Ensure your Storj S3 credentials are correct and have proper permissions
2. **File Not Found**: Verify the input path exists in your Storj bucket
3. **Transcode Failed**: Check the task status error message for details

### Debugging

Enable debug logs in the edge function by checking the Supabase function logs:

```bash
supabase functions logs livepeer-transcode
```

## Resources

- [Livepeer Transcode API Documentation](https://docs.livepeer.org/api-reference/transcode/create)
- [Storj S3 Gateway Documentation](https://docs.storj.io/dcs/api-reference/s3-compatible-gateway)
- [Livepeer Player](https://lvpr.tv/)

## Support

For issues or questions:
- Livepeer Discord: [discord.gg/livepeer](https://discord.gg/livepeer)
- Storj Support: [support.storj.io](https://support.storj.io)
