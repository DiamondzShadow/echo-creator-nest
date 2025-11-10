# TikTok App Review Guide

Complete guide to submit your TikTok app for review and get it approved.

## Overview

Your CrabbyTV app needs TikTok approval to access production APIs. This guide walks you through the review process.

## Pre-Review Checklist

Before submitting for review, ensure:

- [x] App is fully functional with all features working
- [x] OAuth flow works correctly
- [x] All scopes are being used in the app
- [x] Terms of Service page exists: https://crabbytv.com/terms
- [x] Privacy Policy page exists: https://crabbytv.com/privacy
- [x] App is publicly accessible at: https://crabbytv.com

## Required Materials

### 1. Demo Video (REQUIRED)

Create a video (max 50MB, mp4 or mov format) demonstrating:

#### Must Show:
1. **Login with TikTok (Login Kit)**
   - Show the CrabbyTV homepage
   - Click "Connect TikTok Account"
   - TikTok OAuth screen appears
   - User authorizes the app
   - Redirect back to CrabbyTV successfully

2. **User Profile Info (user.info.basic)**
   - Show user's display name displayed in app
   - Show user's avatar displayed
   - Show open_id being used (can be in network tab)

3. **User Statistics (user.info.stats)**
   - Show follower count displayed
   - Show likes count displayed
   - Show video count displayed
   - Show following count displayed

4. **Video List (video.list)**
   - Show user's TikTok videos loading
   - Show video thumbnails
   - Show video titles and descriptions
   - Show "View on TikTok" links

5. **Video Upload (video.upload)**
   - Show upload form
   - Fill in video title and description
   - Click "Upload to TikTok"
   - Show success message
   - (Optional) Show draft video in TikTok app

#### Recording Tips:
- Use HD screen recording (1080p minimum)
- Record actual browser, not simulator
- Show the domain name in address bar (crabbytv.com)
- Use a real TikTok test account (not production)
- Speak or add captions explaining each step
- Keep video under 5 minutes if possible

#### Tools for Recording:
- **Mac**: QuickTime Player (Screen Recording)
- **Windows**: Xbox Game Bar (Win + G)
- **Chrome**: Use extensions like Loom or Screencastify

### 2. App Review Description

Copy this into the TikTok Developer Portal review form:

```
CrabbyTV is a decentralized streaming platform that integrates TikTok to help 
creators manage their content across multiple platforms.

FEATURE IMPLEMENTATION:

1. LOGIN KIT (user.info.basic)
   - Users authenticate with TikTok Login Kit
   - We display their TikTok profile information (display name, avatar, open_id)
   - This allows users to link their TikTok account to CrabbyTV

2. USER STATISTICS (user.info.stats)
   - We fetch and display user statistics from TikTok
   - Shows follower count, following count, likes count, and video count
   - Displayed on user's profile page and dashboard

3. VIDEO LIST (video.list)
   - We fetch the user's public TikTok videos
   - Display video thumbnails, titles, and descriptions
   - Allow users to view their TikTok content within CrabbyTV
   - Provide links to watch videos on TikTok

4. CONTENT POSTING API (video.upload)
   - Users can upload their CrabbyTV videos to TikTok
   - Videos are uploaded as drafts using the Content Posting API
   - Users can then edit and publish from the TikTok app
   - We use pull_by_url method to transfer videos

5. WEBHOOKS
   - Receive notifications when videos are uploaded
   - Receive notifications when videos are deleted
   - Receive notifications when users revoke authorization
   - Helps keep our platform in sync with TikTok

USER FLOW:
1. User signs up on CrabbyTV
2. User clicks "Connect TikTok" in their profile
3. User authorizes CrabbyTV in TikTok
4. CrabbyTV displays their TikTok stats and videos
5. User can upload CrabbyTV content to TikTok
6. User receives tips from viewers across all platforms

This integration allows creators to broadcast on multiple platforms (TikTok, 
YouTube, Twitch) from a single decentralized platform with Web3 tipping capabilities.
```

### 3. App Information

Ensure these are filled correctly in the TikTok Developer Portal:

**Basic Information:**
- **App Name**: CrabbyTV
- **App Icon**: 1024x1024 PNG/JPG (upload your logo)
- **Category**: Photo & Video
- **Description**: 
  ```
  A decentralized streaming platform that allows creators to broadcast from 
  multiple sources including TikTok, YouTube, and Twitch. Features Web3 
  tipping and content management.
  ```

**URLs:**
- **Terms of Service**: https://crabbytv.com/terms
- **Privacy Policy**: https://crabbytv.com/privacy
- **Web/Desktop URL**: https://crabbytv.com/

**Platforms:**
- ✅ Web
- ✅ Desktop
- ⬜ Android (optional)
- ⬜ iOS (optional)

## Configuration Values

### Login Kit
**Redirect URIs:**
```
Web: https://YOUR_SUPABASE_PROJECT.supabase.co/functions/v1/tiktok-oauth
Desktop: https://YOUR_SUPABASE_PROJECT.supabase.co/functions/v1/tiktok-oauth
```

### Webhooks
**Callback URL:**
```
https://YOUR_SUPABASE_PROJECT.supabase.co/functions/v1/tiktok-webhook
```

**Events to Subscribe:**
- video.upload
- video.delete
- user.authorization.revoked

### Content Posting API
- ✅ Upload to TikTok (enabled)
- ✅ Direct Post (enabled)

**Domain to Verify:**
```
crabbytv.com
```

## Submission Process

### Step 1: Prepare Demo Video

1. Set up TikTok sandbox test account
2. Record complete flow showing all features
3. Edit video if needed (trim, add captions)
4. Ensure file size < 50MB
5. Save as MP4 or MOV format

### Step 2: Fill Review Form

1. Go to TikTok Developer Portal
2. Navigate to your app
3. Click "App Review" tab
4. Click "Submit for Review"
5. Fill in all required fields:
   - App explanation (use text above)
   - Upload demo video
   - Confirm all products are selected:
     - Login Kit
     - Content Posting API
     - Webhooks
   - Confirm all scopes are selected:
     - user.info.basic
     - user.info.stats
     - video.list
     - video.upload

### Step 3: Submit

1. Review all information
2. Click "Submit for Review"
3. Wait for TikTok review team response

## Review Timeline

- **Initial Review**: 3-7 business days
- **Follow-up Questions**: 1-3 days per response
- **Approval**: Immediate upon final approval
- **Rejection**: You can resubmit with fixes

## Common Rejection Reasons

### 1. Demo Video Issues
- ❌ Video doesn't show all scopes
- ❌ Video quality too low
- ❌ Not showing actual app domain
- ❌ Using simulator instead of real browser

**Fix**: Re-record video ensuring all points are covered

### 2. Scope Not Used
- ❌ App doesn't use a requested scope
- ❌ Can't see where scope is used in video

**Fix**: Either implement the feature or remove the scope

### 3. URL Mismatch
- ❌ Demo shows different domain than registered
- ❌ Redirect URI doesn't match configuration

**Fix**: Ensure all URLs match exactly

### 4. Missing Documentation
- ❌ Terms of Service returns 404
- ❌ Privacy Policy not accessible
- ❌ No clear explanation of data usage

**Fix**: Ensure all pages are live and accessible

## After Approval

Once approved:

1. ✅ Production credentials become active
2. ✅ All users can connect TikTok accounts
3. ✅ Remove sandbox limitations
4. ✅ Update any sandbox-specific code

### Update Environment Variables
```bash
# If you were using test credentials, update to production
supabase secrets set TIKTOK_CLIENT_KEY=awrrhqxhh6fjb0mj
supabase secrets set TIKTOK_CLIENT_SECRET=oBZPY9dOyVHacTc6n6izs0DigncJ71Sp
```

## Monitoring After Launch

- Monitor API usage in TikTok Developer Portal
- Check for rate limit warnings
- Monitor webhook delivery success rate
- Track user authorization flow success rate

## Support During Review

If TikTok reviewer has questions:

1. **Respond Promptly**: Reply within 24-48 hours
2. **Be Detailed**: Provide screenshots/videos if needed
3. **Be Professional**: Use clear, professional language
4. **Update Docs**: If they request clarification, update your docs

## Rate Limits (After Approval)

Be aware of TikTok API rate limits:

- **OAuth**: 1000 requests per day per user
- **User Info**: 100 requests per day per user
- **Video List**: 100 requests per day per user
- **Video Upload**: 10 uploads per day per user

Implement appropriate caching and rate limiting in your app.

## Re-submission Process

If rejected:

1. Read rejection reason carefully
2. Fix all mentioned issues
3. Update demo video if needed
4. Add explanation of what you fixed
5. Resubmit

## Testing in Sandbox

Before submitting:

1. Create sandbox test users in TikTok Developer Portal
2. Test complete flow with test users
3. Verify all features work as expected
4. Test error cases (token expiry, revoked access)

## Documentation Links

- TikTok Developer Portal: https://developers.tiktok.com/
- App Review Guidelines: https://developers.tiktok.com/doc/app-review-guidelines
- API Rate Limits: https://developers.tiktok.com/doc/about-rate-limits

---

## Need Help?

- Check TikTok Developer Forum: https://developers.tiktok.com/community/
- Email TikTok Support: developer-support@tiktok.com
- Review this guide again carefully

**Good luck with your submission! 🚀**

---

**Last Updated**: 2025-11-10
**Status**: Ready for Submission
