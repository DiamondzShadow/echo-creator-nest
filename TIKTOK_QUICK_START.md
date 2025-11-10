# TikTok Integration - Quick Start Guide

Get TikTok integrated with CrabbyTV in 5 minutes!

## Prerequisites
- Supabase project set up
- TikTok Developer account with app created
- Your TikTok app credentials (provided)

## Step 1: Set Environment Variables (2 minutes)

In your Supabase Dashboard → Project Settings → Edge Functions:

```bash
TIKTOK_CLIENT_KEY=awrrhqxhh6fjb0mj
TIKTOK_CLIENT_SECRET=oBZPY9dOyVHacTc6n6izs0DigncJ71Sp
```

Or via CLI:
```bash
supabase secrets set TIKTOK_CLIENT_KEY=awrrhqxhh6fjb0mj
supabase secrets set TIKTOK_CLIENT_SECRET=oBZPY9dOyVHacTc6n6izs0DigncJ71Sp
```

## Step 2: Deploy Edge Functions (2 minutes)

```bash
# Deploy all TikTok functions
supabase functions deploy tiktok-oauth
supabase functions deploy tiktok-streams
supabase functions deploy tiktok-user-data
supabase functions deploy tiktok-webhook
supabase functions deploy tiktok-upload
```

## Step 3: Configure TikTok Developer Portal (1 minute)

Go to https://developers.tiktok.com/apps/ and configure:

### Redirect URIs (Login Kit)
Add these redirect URIs (replace `YOUR_PROJECT` with your Supabase project reference):

```
https://YOUR_PROJECT.supabase.co/functions/v1/tiktok-oauth
```

### Webhook URL
```
https://YOUR_PROJECT.supabase.co/functions/v1/tiktok-webhook
```

## Step 4: Test It! (< 1 minute)

1. Go to `https://crabbytv.com/live`
2. Click the **TikTok** tab
3. Click **Connect TikTok Account**
4. Authorize in TikTok
5. You should see "TikTok Connected!" 🎉

## Quick Reference

### Your App Details
- **App Name**: CrabbyTV
- **Client Key**: `awrrhqxhh6fjb0mj`
- **Category**: Photo & Video

### Scopes Enabled
- `user.info.basic` - User profile
- `user.info.stats` - Statistics (followers, likes)
- `video.list` - List videos
- `video.upload` - Upload videos (Content Posting API)

### Key URLs
- **OAuth Redirect**: `https://YOUR_PROJECT.supabase.co/functions/v1/tiktok-oauth`
- **Webhook**: `https://YOUR_PROJECT.supabase.co/functions/v1/tiktok-webhook`
- **Upload**: `https://YOUR_PROJECT.supabase.co/functions/v1/tiktok-upload`

## Features Available

✅ **Login with TikTok** - OAuth authentication
✅ **View TikTok Videos** - Display user's content
✅ **View Statistics** - Followers, likes, video count
✅ **Upload to TikTok** - Post content via Content Posting API
✅ **Webhooks** - Real-time notifications
✅ **Token Refresh** - Automatic token management

## Usage Examples

### Connect TikTok Account
```typescript
// Already implemented in TikTokConnect component
// Users click "Connect TikTok Account" button
```

### Upload Video to TikTok
```typescript
import { TikTokUpload } from '@/components/TikTokUpload';

<TikTokUpload 
  videoUrl="https://your-video.mp4"
  defaultTitle="My awesome video"
  defaultDescription="Check this out!"
/>
```

### Fetch User Videos
```typescript
const { data } = await supabase.functions.invoke('tiktok-user-data', {
  headers: { Authorization: `Bearer ${accessToken}` }
});
console.log(data.videos); // Array of user videos
console.log(data.stats); // { follower_count, likes_count, etc. }
```

## Troubleshooting

### "TikTok not connected" error
1. Make sure you've authorized the app
2. Check `platform_connections` table in database
3. Verify OAuth redirect URI matches exactly

### OAuth redirect fails
1. Verify redirect URI in TikTok Developer Portal
2. Check environment variables are set
3. View logs: `supabase functions logs tiktok-oauth`

### Upload fails
1. Ensure video URL is publicly accessible
2. Verify `video.upload` scope is approved
3. Check video meets TikTok requirements (size, format)

## Next Steps

1. **For App Review**: Create demo video showing all features
2. **For Production**: Update URLs to production environment
3. **For Monitoring**: Set up logging and alerts

## Support

📖 Full Documentation: See `TIKTOK_INTEGRATION_SETUP.md`
✅ Deployment Checklist: See `TIKTOK_DEPLOYMENT_CHECKLIST.md`
🔧 TikTok Developer Portal: https://developers.tiktok.com/

---

**Status**: ✅ Ready to Deploy
**Last Updated**: 2025-11-10
