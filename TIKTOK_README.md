# TikTok Integration for CrabbyTV

Complete TikTok integration with OAuth, video management, and content posting capabilities.

## 🎯 Quick Links

- **Quick Start** (5 mins): [`TIKTOK_QUICK_START.md`](./TIKTOK_QUICK_START.md)
- **Configuration Summary**: [`TIKTOK_CONFIGURATION_SUMMARY.md`](./TIKTOK_CONFIGURATION_SUMMARY.md)
- **Complete Setup Guide**: [`TIKTOK_INTEGRATION_SETUP.md`](./TIKTOK_INTEGRATION_SETUP.md)
- **Deployment Checklist**: [`TIKTOK_DEPLOYMENT_CHECKLIST.md`](./TIKTOK_DEPLOYMENT_CHECKLIST.md)
- **App Review Guide**: [`TIKTOK_APP_REVIEW_GUIDE.md`](./TIKTOK_APP_REVIEW_GUIDE.md)

## 🚀 What's Been Built

### Edge Functions
1. **tiktok-oauth** - OAuth authentication flow
2. **tiktok-streams** - Fetch user videos
3. **tiktok-user-data** - Get user statistics
4. **tiktok-webhook** - Handle TikTok events (NEW!)
5. **tiktok-upload** - Upload videos to TikTok (NEW!)

### React Components
1. **TikTokConnect** - Connect/disconnect TikTok account
2. **TikTokEmbed** - Display TikTok content
3. **TikTokUpload** - Upload videos to TikTok (NEW!)

### Features
✅ Login with TikTok (OAuth)
✅ View user profile and statistics
✅ Browse user's TikTok videos
✅ Upload videos to TikTok
✅ Real-time webhooks
✅ Automatic token refresh

## 📦 Your App Configuration

### Credentials
```
Client Key: awrrhqxhh6fjb0mj
Client Secret: oBZPY9dOyVHacTc6n6izs0DigncJ71Sp
```

### Scopes
- `user.info.basic` - User profile
- `user.info.stats` - Statistics
- `video.list` - Video list
- `video.upload` - Upload videos ⭐ NEW

### Products
- Login Kit
- Content Posting API ⭐ NEW
- Webhooks ⭐ NEW

## 🎬 Getting Started

### 1. Set Environment Variables (2 mins)

```bash
supabase secrets set TIKTOK_CLIENT_KEY=awrrhqxhh6fjb0mj
supabase secrets set TIKTOK_CLIENT_SECRET=oBZPY9dOyVHacTc6n6izs0DigncJ71Sp
```

### 2. Deploy Functions (2 mins)

```bash
supabase functions deploy tiktok-oauth
supabase functions deploy tiktok-streams  
supabase functions deploy tiktok-user-data
supabase functions deploy tiktok-webhook
supabase functions deploy tiktok-upload
```

### 3. Configure TikTok Portal (1 min)

**Redirect URI:**
```
https://YOUR_PROJECT.supabase.co/functions/v1/tiktok-oauth
```

**Webhook URL:**
```
https://YOUR_PROJECT.supabase.co/functions/v1/tiktok-webhook
```

### 4. Test It!

Visit `https://crabbytv.com/live` → TikTok tab → Connect TikTok Account

## 📖 Documentation Structure

```
TIKTOK_README.md (you are here)
├── TIKTOK_QUICK_START.md          ← Start here for 5-min setup
├── TIKTOK_CONFIGURATION_SUMMARY.md ← What's been configured
├── TIKTOK_INTEGRATION_SETUP.md     ← Complete technical guide
├── TIKTOK_DEPLOYMENT_CHECKLIST.md  ← Deployment checklist
└── TIKTOK_APP_REVIEW_GUIDE.md      ← TikTok submission guide
```

## 🔧 Usage Examples

### Connect TikTok Account

```tsx
import { TikTokConnect } from '@/components/TikTokConnect';

<TikTokConnect onSelectStream={(url) => console.log(url)} />
```

### Upload to TikTok

```tsx
import { TikTokUpload } from '@/components/TikTokUpload';

<TikTokUpload 
  videoUrl="https://example.com/video.mp4"
  defaultTitle="My Video"
  defaultDescription="Check this out!"
/>
```

### Fetch User Data

```typescript
const { data } = await supabase.functions.invoke('tiktok-user-data', {
  headers: { Authorization: `Bearer ${token}` }
});

console.log(data.stats); // { follower_count, likes_count, ... }
console.log(data.videos); // Array of videos
```

## 🎯 Next Steps

### For Development
1. ✅ Deploy edge functions
2. ✅ Configure TikTok Developer Portal
3. ✅ Test OAuth flow
4. ✅ Test upload functionality

### For Production
1. 📹 Create demo video (see App Review Guide)
2. 📝 Submit for TikTok review
3. ⏳ Wait for approval (3-7 days)
4. 🚀 Go live!

## 🔍 Troubleshooting

### OAuth not working?
- Check redirect URI matches exactly
- Verify environment variables are set
- Check logs: `supabase functions logs tiktok-oauth`

### Upload failing?
- Ensure video URL is publicly accessible
- Verify `video.upload` scope is approved
- Check video meets TikTok requirements

### Webhooks not receiving?
- Verify webhook URL is correct
- Check subscribed events in TikTok portal
- Test with `curl` to verify endpoint is accessible

## 📊 Architecture

```
┌──────────┐     ┌───────────────┐     ┌─────────────┐
│  React   │────▶│   Supabase    │────▶│  TikTok API │
│  App     │◀────│Edge Functions │◀────│             │
└──────────┘     └───────────────┘     └─────────────┘
                         │
                         ▼
                 ┌───────────────┐
                 │   Database    │
                 │  (platform_   │
                 │ connections)  │
                 └───────────────┘
```

## 🎓 Additional Resources

- [TikTok Developer Docs](https://developers.tiktok.com/)
- [TikTok API Reference](https://developers.tiktok.com/doc/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [OAuth 2.0 Specification](https://oauth.net/2/)

## 🐛 Support

1. Check the documentation files listed above
2. Review Supabase function logs
3. Test in incognito/private browser
4. Check TikTok Developer Portal for API status

## ✨ Features Roadmap

Current (v1.0):
- ✅ OAuth authentication
- ✅ Video list & statistics
- ✅ Upload to TikTok
- ✅ Webhooks

Future (v2.0):
- 🔜 TikTok Live streaming (requires special approval)
- 🔜 Video analytics
- 🔜 Scheduled uploads
- 🔜 Multi-account management

---

**Status**: ✅ Ready for deployment
**Last Updated**: 2025-11-10
**Version**: 1.0.0

**Need help?** Start with [`TIKTOK_QUICK_START.md`](./TIKTOK_QUICK_START.md)
