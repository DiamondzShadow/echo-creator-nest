# TikTok Integration Setup Guide

This guide will help you configure TikTok integration for CrabbyTV.

## App Configuration

Your TikTok app has been configured with the following details:

- **App Name**: CrabbyTV
- **Client Key**: `awrrhqxhh6fjb0mj`
- **Client Secret**: `oBZPY9dOyVHacTc6n6izs0DigncJ71Sp`
- **Category**: Photo & Video
- **Website**: https://crabbytv.com/

## Required Environment Variables

Add these environment variables to your Supabase project:

### In Supabase Dashboard → Project Settings → Edge Functions

```bash
TIKTOK_CLIENT_KEY=awrrhqxhh6fjb0mj
TIKTOK_CLIENT_SECRET=oBZPY9dOyVHacTc6n6izs0DigncJ71Sp
```

### In your `.env.local` file (for frontend)

```bash
VITE_TIKTOK_CLIENT_KEY=awrrhqxhh6fjb0mj
```

## TikTok Developer Portal Configuration

### 1. Redirect URI Configuration

In the TikTok Developer Portal, add these Redirect URIs under **Login Kit**:

**Web/Desktop:**
```
https://YOUR_SUPABASE_PROJECT.supabase.co/functions/v1/tiktok-oauth
https://crabbytv.com/live?tiktok=connected
```

Replace `YOUR_SUPABASE_PROJECT` with your actual Supabase project reference.

### 2. Webhook Configuration

Under **Webhooks**, set the Callback URL to:

```
https://YOUR_SUPABASE_PROJECT.supabase.co/functions/v1/tiktok-webhook
```

**Webhook Events to Subscribe:**
- `video.upload` - Notifies when a video is uploaded
- `video.delete` - Notifies when a video is deleted
- `user.authorization.revoked` - Notifies when user revokes access

### 3. Content Posting API Configuration

For the Content Posting API:
- **Direct Post** is enabled
- **Upload to TikTok** is enabled (creates drafts)

To use `pull_by_url` for video uploads, you need to verify your domains:
1. Go to Content Posting API settings
2. Click "Verify domains"
3. Add `crabbytv.com`
4. Follow TikTok's domain verification process

## Products and Scopes

Your app uses these TikTok products and scopes:

### Products
- **Login Kit** - Authenticate users with TikTok
- **Content Posting API** - Upload videos to TikTok
- **Webhooks** - Receive real-time notifications

### Scopes
- `user.info.basic` - Read user profile (display name, avatar, etc.)
- `user.info.stats` - Read user statistics (followers, likes, video count)
- `video.list` - Read user's public videos
- `video.upload` - Upload videos to user's TikTok account

## Edge Functions

The following Supabase Edge Functions handle TikTok integration:

### 1. `tiktok-oauth`
Handles OAuth authentication flow (authorization and callback).

**Endpoints:**
- `POST /tiktok-oauth?action=authorize` - Start OAuth flow
- `GET /tiktok-oauth?code=...&state=...` - OAuth callback
- `POST /tiktok-oauth?action=disconnect` - Disconnect TikTok

### 2. `tiktok-streams`
Fetches user's TikTok videos and streams.

### 3. `tiktok-user-data`
Retrieves user statistics and video list.

### 4. `tiktok-webhook`
Receives and processes TikTok webhook events.

### 5. `tiktok-upload`
Uploads videos to TikTok using Content Posting API.

## Deployment Steps

### 1. Deploy Edge Functions

```bash
# From your project root
supabase functions deploy tiktok-oauth
supabase functions deploy tiktok-streams
supabase functions deploy tiktok-user-data
supabase functions deploy tiktok-webhook
supabase functions deploy tiktok-upload
```

### 2. Set Environment Variables

```bash
supabase secrets set TIKTOK_CLIENT_KEY=awrrhqxhh6fjb0mj
supabase secrets set TIKTOK_CLIENT_SECRET=oBZPY9dOyVHacTc6n6izs0DigncJ71Sp
```

### 3. Test the Integration

1. Go to https://crabbytv.com/live
2. Switch to the "TikTok" tab
3. Click "Connect TikTok Account"
4. Authorize the app in TikTok
5. You should be redirected back with a success message

## Usage

### Connecting TikTok Account

Users can connect their TikTok account from:
- Live streaming page: `/live` → TikTok tab
- Profile settings (if implemented)

### Viewing TikTok Content

Once connected, users can:
- View their TikTok videos
- See their TikTok statistics
- Pull TikTok streams (requires TikTok Live Access approval)

### Uploading to TikTok

To upload a video to TikTok:

```typescript
const { data, error } = await supabase.functions.invoke('tiktok-upload', {
  body: {
    videoUrl: 'https://your-video-url.com/video.mp4',
    title: 'My awesome video',
    description: 'Check out this cool content!',
    privacy_level: 'PUBLIC_TO_EVERYONE',
    disable_duet: false,
    disable_comment: false,
    disable_stitch: false,
  },
});
```

## App Review Requirements

For TikTok app submission, you need to provide:

### 1. Demo Video
Create a video showing:
- User logging in with TikTok
- Connecting TikTok account in CrabbyTV
- Viewing TikTok videos in the app
- The complete OAuth flow
- All scopes being used (profile info, stats, video list, upload)

### 2. App Review Description

```
CrabbyTV integrates TikTok Login Kit to authenticate users and allow them to 
connect their TikTok accounts. Users can:

1. Sign in with TikTok (user.info.basic)
2. View their profile information including display name and avatar
3. Access their TikTok statistics (user.info.stats) - followers, likes, video count
4. Browse their uploaded TikTok videos (video.list)
5. Upload content to their TikTok account as drafts (video.upload)

The integration allows creators to manage their content across multiple platforms
including TikTok, YouTube, and Twitch from a single decentralized streaming platform.
```

## Troubleshooting

### OAuth Redirect Not Working

1. Verify redirect URI in TikTok Developer Portal exactly matches:
   ```
   https://YOUR_PROJECT.supabase.co/functions/v1/tiktok-oauth
   ```
2. Check that environment variables are set correctly
3. Check Supabase Edge Function logs: `supabase functions logs tiktok-oauth`

### Webhook Not Receiving Events

1. Verify webhook URL in TikTok Developer Portal
2. Check that webhook handler is deployed
3. Ensure webhook events are subscribed in TikTok portal
4. Check logs: `supabase functions logs tiktok-webhook`

### Video Upload Failing

1. Ensure `video.upload` scope is approved by TikTok
2. Verify token hasn't expired (function auto-refreshes)
3. Check video URL is publicly accessible
4. Ensure video meets TikTok requirements (format, size, duration)

## Testing with Sandbox

During development, use TikTok's sandbox environment:

1. Create test accounts in TikTok Developer Portal
2. Use sandbox credentials for testing
3. Once testing is complete, submit for review
4. After approval, update to production credentials

## Important Notes

- **TikTok Live Access**: To pull live streams from TikTok, you need special approval. Contact TikTok to request Live Access API.
- **Content Posting API**: Videos are uploaded as drafts by default. Users can then edit and publish them in the TikTok app.
- **Rate Limits**: TikTok has rate limits on API calls. Implement appropriate caching and throttling.
- **Token Refresh**: Access tokens expire. The functions automatically refresh tokens when needed.

## Support

For TikTok API issues:
- TikTok Developer Documentation: https://developers.tiktok.com/
- TikTok Developer Forum: https://developers.tiktok.com/community/

For CrabbyTV integration issues:
- Check Supabase Edge Function logs
- Review database `platform_connections` table
- Test OAuth flow in incognito/private browser window
