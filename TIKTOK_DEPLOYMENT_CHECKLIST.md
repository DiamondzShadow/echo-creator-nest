# TikTok Integration Deployment Checklist

Use this checklist to ensure your TikTok integration is properly configured.

## 1. Environment Variables ✓

### Supabase Edge Functions (Required)
- [ ] Set `TIKTOK_CLIENT_KEY=awrrhqxhh6fjb0mj` in Supabase Dashboard
- [ ] Set `TIKTOK_CLIENT_SECRET=oBZPY9dOyVHacTc6n6izs0DigncJ71Sp` in Supabase Dashboard

**How to set:**
```bash
supabase secrets set TIKTOK_CLIENT_KEY=awrrhqxhh6fjb0mj
supabase secrets set TIKTOK_CLIENT_SECRET=oBZPY9dOyVHacTc6n6izs0DigncJ71Sp
```

### Frontend Environment (Optional)
- [ ] Add `VITE_TIKTOK_CLIENT_KEY=awrrhqxhh6fjb0mj` to `.env.local`

## 2. Deploy Edge Functions ✓

- [ ] Deploy `tiktok-oauth` function
- [ ] Deploy `tiktok-streams` function
- [ ] Deploy `tiktok-user-data` function
- [ ] Deploy `tiktok-webhook` function
- [ ] Deploy `tiktok-upload` function

**Commands:**
```bash
supabase functions deploy tiktok-oauth
supabase functions deploy tiktok-streams
supabase functions deploy tiktok-user-data
supabase functions deploy tiktok-webhook
supabase functions deploy tiktok-upload
```

## 3. TikTok Developer Portal Configuration ✓

### Login Kit - Redirect URIs
- [ ] Add Web redirect URI: `https://YOUR_PROJECT.supabase.co/functions/v1/tiktok-oauth`
- [ ] Add Desktop redirect URI: Same as Web
- [ ] (Optional) Add redirect: `https://crabbytv.com/live?tiktok=connected`

### Webhooks
- [ ] Set Callback URL: `https://YOUR_PROJECT.supabase.co/functions/v1/tiktok-webhook`
- [ ] Subscribe to event: `video.upload`
- [ ] Subscribe to event: `video.delete`
- [ ] Subscribe to event: `user.authorization.revoked`

### Content Posting API
- [ ] Enable "Upload to TikTok" (for drafts)
- [ ] Enable "Direct Post" (optional)
- [ ] Verify domain: `crabbytv.com` (for pull_by_url)

### App Information
- [ ] App Name: `CrabbyTV`
- [ ] Category: `Photo & Video`
- [ ] Terms of Service URL: `https://crabbytv.com/terms`
- [ ] Privacy Policy URL: `https://crabbytv.com/privacy`
- [ ] Web/Desktop URL: `https://crabbytv.com/`

## 4. Database Setup ✓

The database schema already supports TikTok:

- [ ] Verify `platform_connections` table exists
- [ ] Verify `platform_type` enum includes 'tiktok'
- [ ] Test connection storage

**Test Query:**
```sql
SELECT * FROM platform_connections WHERE platform = 'tiktok';
```

## 5. Testing ✓

### OAuth Flow
- [ ] Visit `/live` page
- [ ] Switch to TikTok tab
- [ ] Click "Connect TikTok Account"
- [ ] Authorize in TikTok
- [ ] Verify redirect back to CrabbyTV
- [ ] Verify connection shows as "Active"

### View TikTok Content
- [ ] Click "Refresh Content" button
- [ ] Verify TikTok videos load
- [ ] Verify thumbnails display
- [ ] Verify "View on TikTok" links work

### Upload to TikTok
- [ ] Navigate to video page
- [ ] Open TikTok upload component
- [ ] Fill in title and description
- [ ] Click "Upload to TikTok"
- [ ] Verify success message
- [ ] Check TikTok app for draft video

### Webhooks
- [ ] Trigger a webhook event (upload/delete video)
- [ ] Check function logs: `supabase functions logs tiktok-webhook`
- [ ] Verify event was received and processed

## 6. Error Handling ✓

- [ ] Test expired token refresh
- [ ] Test disconnected account error
- [ ] Test invalid video URL error
- [ ] Test network failure handling
- [ ] Verify error messages are user-friendly

## 7. App Review Preparation ✓

### Demo Video
- [ ] Record OAuth flow (login with TikTok)
- [ ] Show profile information display
- [ ] Show statistics display (followers, likes, etc.)
- [ ] Show video list loading
- [ ] Show video upload to TikTok
- [ ] Show all scopes in action
- [ ] Ensure video is under 50MB

### App Review Form
- [ ] Fill in explanation text (see TIKTOK_INTEGRATION_SETUP.md)
- [ ] Upload demo video
- [ ] Verify all products are listed:
  - Login Kit
  - Content Posting API
  - Webhooks
- [ ] Verify all scopes are listed:
  - user.info.basic
  - user.info.stats
  - video.list
  - video.upload

## 8. Production Deployment ✓

- [ ] Update frontend with production Supabase URL
- [ ] Verify environment variables are set in production
- [ ] Deploy all edge functions to production
- [ ] Update TikTok redirect URIs with production URLs
- [ ] Update webhook URL with production URL
- [ ] Test complete flow in production

## 9. Monitoring & Maintenance ✓

- [ ] Set up Edge Function monitoring
- [ ] Monitor TikTok API rate limits
- [ ] Set up alerts for webhook failures
- [ ] Monitor token refresh success rate
- [ ] Review error logs weekly

### Useful Commands
```bash
# View function logs
supabase functions logs tiktok-oauth --tail
supabase functions logs tiktok-webhook --tail
supabase functions logs tiktok-upload --tail

# Check function status
supabase functions list
```

## 10. Documentation ✓

- [ ] Update main README with TikTok features
- [ ] Document TikTok setup for team
- [ ] Create user guide for TikTok integration
- [ ] Document troubleshooting steps

## URLs to Remember

Replace `YOUR_PROJECT` with your Supabase project reference:

- **OAuth Redirect**: `https://YOUR_PROJECT.supabase.co/functions/v1/tiktok-oauth`
- **Webhook URL**: `https://YOUR_PROJECT.supabase.co/functions/v1/tiktok-webhook`
- **TikTok Developer Portal**: https://developers.tiktok.com/apps/
- **Supabase Dashboard**: https://app.supabase.com/project/YOUR_PROJECT

## Quick Test Script

Run this in your browser console on crabbytv.com:

```javascript
// Test TikTok OAuth
const testTikTok = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    console.error('Not logged in');
    return;
  }
  
  // Test authorization
  const { data, error } = await supabase.functions.invoke('tiktok-oauth', {
    body: { action: 'authorize' },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Auth URL:', data.authUrl);
    // window.location.href = data.authUrl; // Uncomment to test
  }
};

testTikTok();
```

## Support Resources

- **TikTok Developer Docs**: https://developers.tiktok.com/
- **TikTok API Reference**: https://developers.tiktok.com/doc/
- **Supabase Edge Functions**: https://supabase.com/docs/guides/functions
- **Project Docs**: See TIKTOK_INTEGRATION_SETUP.md

---

**Last Updated**: 2025-11-10
**Integration Status**: ✅ Complete - Ready for Testing
