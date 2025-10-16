# Storj Integration Setup Guide

This guide will help you set up Storj decentralized storage with Livepeer transcoding for your application.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Storj Account Setup](#storj-account-setup)
3. [Generate S3 Credentials](#generate-s3-credentials)
4. [Configure Environment Variables](#configure-environment-variables)
5. [Deploy Edge Functions](#deploy-edge-functions)
6. [Test the Integration](#test-the-integration)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

- Node.js 18+ installed
- Supabase CLI installed (`npm install -g supabase`)
- A Livepeer Studio account with API key
- A Storj account (free tier available)

## Storj Account Setup

### 1. Create a Storj Account

1. Go to [https://www.storj.io/](https://www.storj.io/)
2. Click "Get Started" and create an account
3. Verify your email address
4. Complete the onboarding process

### 2. Create a Bucket

1. Navigate to the Storj dashboard
2. Click "Buckets" in the sidebar
3. Click "New Bucket"
4. Enter a bucket name (e.g., `livepeer-videos`)
5. Click "Create Bucket"

## Generate S3 Credentials

### Method 1: Using Storj Web Interface

1. In the Storj dashboard, click "Access" in the sidebar
2. Click "Create Access Grant"
3. Choose "S3 Credentials"
4. Name your credentials (e.g., `livepeer-transcode`)
5. Select permissions:
   - ✅ Read
   - ✅ Write
   - ✅ List
   - ✅ Delete
6. Choose the bucket you created
7. Click "Generate Credentials"
8. **Save the Access Key ID and Secret Access Key** (you won't be able to see the secret again!)

### Method 2: Using Uplink CLI

```bash
# Install uplink
curl -L https://github.com/storj/storj/releases/latest/download/uplink_linux_amd64.zip -o uplink.zip
unzip uplink.zip
sudo mv uplink /usr/local/bin/

# Setup access
uplink setup

# Generate S3 credentials
uplink access create livepeer-transcode --s3

# Export credentials
uplink access export livepeer-transcode
```

## Configure Environment Variables

### 1. Local Development

Create or update your `.env.local` file:

```bash
# Livepeer
LIVEPEER_API_KEY=your_livepeer_api_key

# Storj S3 Credentials
STORJ_ACCESS_KEY_ID=your_access_key_id
STORJ_SECRET_ACCESS_KEY=your_secret_access_key
STORJ_BUCKET=livepeer-videos
STORJ_ENDPOINT=https://gateway.storjshare.io

# Storj Share Path (for playback URLs)
STORJ_BUCKET_SHARE_PATH=your_bucket_share_path
```

### 2. Supabase Production

Add environment variables to your Supabase project:

```bash
# Using Supabase CLI
supabase secrets set LIVEPEER_API_KEY=your_livepeer_api_key
supabase secrets set STORJ_ACCESS_KEY_ID=your_access_key_id
supabase secrets set STORJ_SECRET_ACCESS_KEY=your_secret_access_key
supabase secrets set STORJ_BUCKET=livepeer-videos
supabase secrets set STORJ_ENDPOINT=https://gateway.storjshare.io
```

Or using the Supabase Dashboard:
1. Go to your project settings
2. Click "Edge Functions" → "Environment Variables"
3. Add each variable with its value

## Deploy Edge Functions

### 1. Deploy Transcode Function

```bash
supabase functions deploy livepeer-transcode
```

### 2. Deploy Upload Function

```bash
supabase functions deploy storj-upload
```

### 3. Verify Deployment

```bash
supabase functions list
```

You should see:
- `livepeer-transcode`
- `storj-upload`
- Other existing functions

## Setup Bucket Sharing for Playback

To enable public playback of transcoded videos:

### Using Uplink CLI

```bash
# Create a shareable link for your bucket
uplink share sj://livepeer-videos/ \
  --url \
  --not-after=none \
  --base-url=https://link.storjshare.io

# This will output a URL like:
# https://link.storjshare.io/jwjfgdxkvmfgngsgitii6pny62za/livepeer-videos
```

Save the path portion (`jwjfgdxkvmfgngsgitii6pny62za/livepeer-videos`) as your `STORJ_BUCKET_SHARE_PATH`.

### Using Web Interface

1. Navigate to "Buckets" in Storj dashboard
2. Select your bucket
3. Click "Share Bucket"
4. Configure sharing settings:
   - Access: Public or restricted
   - Expiration: Set if needed
5. Copy the generated URL
6. Extract the path portion for `STORJ_BUCKET_SHARE_PATH`

## Test the Integration

### 1. Test Upload Function

```bash
curl -X POST \
  https://your-project.supabase.co/functions/v1/storj-upload \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "generate-upload-url",
    "filename": "test.mp4",
    "contentType": "video/mp4"
  }'
```

### 2. Upload a Test Video

Use the Storj web interface or uplink CLI:

```bash
uplink cp /path/to/video.mp4 sj://livepeer-videos/test/video.mp4
```

### 3. Test Transcode Function

```bash
curl -X POST \
  https://your-project.supabase.co/functions/v1/livepeer-transcode \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create",
    "inputPath": "/test/video.mp4",
    "profiles": [
      {
        "name": "720p",
        "bitrate": 3000000,
        "fps": 30,
        "width": 1280,
        "height": 720
      }
    ]
  }'
```

### 4. Check Task Status

```bash
curl -X POST \
  https://your-project.supabase.co/functions/v1/livepeer-transcode \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "status",
    "taskId": "TASK_ID_FROM_PREVIOUS_STEP"
  }'
```

### 5. Test in Browser

Navigate to your application and use the UI component:

```typescript
import { StorjTranscodeWithUpload } from '@/components/StorjTranscodeWithUpload';

function TranscodePage() {
  return <StorjTranscodeWithUpload />;
}
```

## Integration Examples

### React Component Usage

```tsx
import { StorjTranscode } from '@/components/StorjTranscode';
import { StorjTranscodeWithUpload } from '@/components/StorjTranscodeWithUpload';

// Basic transcode (file already in Storj)
<StorjTranscode />

// Upload and transcode
<StorjTranscodeWithUpload />
```

### Programmatic Usage

```typescript
import { supabase } from '@/integrations/supabase/client';

// Transcode a video
const { data } = await supabase.functions.invoke('livepeer-transcode', {
  body: {
    action: 'create',
    inputPath: '/video/source.mp4',
    outputHlsPath: '/transcoded/hls',
    outputMp4Path: '/transcoded/mp4'
  }
});

console.log('Task ID:', data.taskId);
```

## Troubleshooting

### Common Issues

#### 1. "Storj credentials are not configured"

**Problem:** Environment variables are not set correctly.

**Solution:**
- Verify variables are set in Supabase dashboard
- Redeploy edge functions after setting variables
- Check variable names match exactly

#### 2. "Access Denied" or "403 Forbidden"

**Problem:** S3 credentials don't have proper permissions.

**Solution:**
- Regenerate credentials with Read, Write, List permissions
- Ensure credentials are for the correct bucket
- Verify bucket name matches environment variable

#### 3. "File not found" during transcode

**Problem:** Input path is incorrect or file doesn't exist.

**Solution:**
- Verify file exists in Storj bucket
- Check path format (should start with `/`)
- List bucket contents to confirm path

#### 4. Transcode fails without error message

**Problem:** Video format may not be supported.

**Solution:**
- Check video codec (H.264 recommended)
- Verify file is not corrupted
- Try with a known-good video file

#### 5. Playback URL doesn't work

**Problem:** Bucket sharing not configured correctly.

**Solution:**
- Ensure bucket is shared publicly
- Verify STORJ_BUCKET_SHARE_PATH is correct
- Check CORS settings if needed

### Debug Logs

View edge function logs:

```bash
# View transcode function logs
supabase functions logs livepeer-transcode

# View upload function logs
supabase functions logs storj-upload
```

### Test S3 Connectivity

Test Storj S3 endpoint:

```bash
curl -I https://gateway.storjshare.io
```

Should return `200 OK`.

## Security Best Practices

1. **Never expose secret keys in client code**
   - Always use edge functions for operations requiring credentials
   - Generate pre-signed URLs on the server

2. **Use environment variables**
   - Store all credentials as environment variables
   - Never commit credentials to version control

3. **Implement access control**
   - Validate user permissions before allowing transcodes
   - Rate limit transcode requests

4. **Monitor usage**
   - Track Storj storage usage
   - Monitor Livepeer API usage
   - Set up alerts for unusual activity

## Cost Considerations

### Storj Pricing

- **Storage:** $4/TB/month
- **Download:** $7/TB
- **Upload:** Free
- **Free tier:** 25GB storage, 25GB download per month

### Livepeer Pricing

- **Transcoding:** Pay per minute transcoded
- Check [Livepeer pricing](https://livepeer.org/pricing) for current rates

### Optimization Tips

1. Only transcode when necessary
2. Use appropriate quality profiles for your use case
3. Enable caching for frequently accessed content
4. Clean up old transcoded files periodically

## Next Steps

1. ✅ Set up Storj account and credentials
2. ✅ Configure environment variables
3. ✅ Deploy edge functions
4. ✅ Test the integration
5. 📝 Implement in your application
6. 🎥 Upload and transcode videos
7. 📺 Set up video playback

## Resources

- [Storj Documentation](https://docs.storj.io/)
- [Livepeer Transcode API](https://docs.livepeer.org/api-reference/transcode/create)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Example Code](/examples/storj-transcode-example.ts)
- [Integration Guide](/STORJ_TRANSCODE_GUIDE.md)

## Support

For help and questions:

- **Storj Discord:** [discord.gg/storj](https://discord.gg/storj)
- **Livepeer Discord:** [discord.gg/livepeer](https://discord.gg/livepeer)
- **Supabase Discord:** [discord.gg/supabase](https://discord.gg/supabase)
