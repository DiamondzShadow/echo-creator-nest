# Twitch OAuth Connection Fix

## Problem
The Twitch OAuth connection was failing because the redirect URL was hardcoded to `https://crabbytv.com/auth/twitch/callback`, which doesn't work on preview domains.

## What Was Fixed

### 1. Dynamic Redirect URLs
✅ **Frontend** (`src/components/TwitchConnect.tsx`):
- Now uses `window.location.origin` to dynamically set redirect URL
- Works on both preview and production domains

✅ **Backend** (`supabase/functions/twitch-oauth/index.ts`):
- Extracts origin from request headers
- Constructs redirect URL dynamically
- Falls back to production URL if needed

## Required: Update Twitch App Settings

You **MUST** add redirect URLs to your Twitch application:

### Step 1: Go to Twitch Developer Console
1. Visit: https://dev.twitch.tv/console/apps
2. Log in with your Twitch account
3. Find your application (Client ID: `hdm6ufl160ptki0gbht94s57515oyj`)
4. Click "Manage"

### Step 2: Add Redirect URLs
In the "OAuth Redirect URLs" section, add:

```
https://crabbytv.com/auth/twitch/callback
https://3c573353-c0fb-4125-b052-a56f89c77dfd.lovableproject.com/auth/twitch/callback
```

**Important:** You must add BOTH:
- ✅ Production domain (crabbytv.com)
- ✅ Preview domain (your current Lovable preview URL)

### Step 3: Save Changes
Click "Save" at the bottom of the page.

## Testing the Fix

### Test on Preview Domain
1. Navigate to `/live` on your preview URL
2. Click the "Twitch" tab
3. Click "Connect" button
4. Authorize on Twitch
5. Should redirect back successfully

### Expected Flow
```
User clicks "Connect"
    ↓
Redirects to Twitch authorization
    ↓
User authorizes app
    ↓
Twitch redirects to: {current_domain}/auth/twitch/callback?code=xxx
    ↓
TwitchCallback page processes the code
    ↓
Calls twitch-oauth edge function
    ↓
Success! User connected
```

### Check Console Logs
After clicking Connect, check browser console for:
- OAuth redirect URL being used
- Any error messages

### Check Edge Function Logs
```bash
npx supabase functions logs twitch-oauth --project-ref woucixqbnzmvlvnaaelb
```

You should see:
```
Exchanging code for token...
Token obtained successfully
Twitch user: {username}
Connection saved successfully
Creating EventSub subscriptions...
Created stream.online subscription: {id}
Created stream.offline subscription: {id}
```

## Common Issues

### Issue: "redirect_uri does not match"
**Cause:** The redirect URL isn't added to Twitch app settings

**Solution:** 
1. Add your current domain's redirect URL to Twitch app settings
2. Make sure the URL exactly matches (including protocol and path)

### Issue: "Invalid client_id"
**Cause:** VITE_TWITCH_CLIENT_ID not set or incorrect

**Solution:**
1. Check `.env` file has correct client ID
2. Verify it matches your Twitch app

### Issue: "No authorization code provided"
**Cause:** Redirect happened but code wasn't captured

**Solution:**
1. Check browser console for errors
2. Verify redirect URL in Twitch app settings
3. Make sure `/auth/twitch/callback` route exists

### Issue: Still doesn't work after adding redirect URLs
**Possible Causes:**
1. Didn't click "Save" in Twitch Developer Console
2. Browser cache - try in incognito mode
3. Wrong Twitch app being modified

**Debug Steps:**
1. Clear browser cache
2. Try connecting in incognito window
3. Check network tab for failed requests
4. Verify Twitch app settings were saved

## Deployment Checklist

When deploying to production:

✅ Ensure production redirect URL is added to Twitch app:
   `https://crabbytv.com/auth/twitch/callback`

✅ Ensure preview redirect URL is added (for testing):
   `https://{your-preview-id}.lovableproject.com/auth/twitch/callback`

✅ If using custom domain, add that too:
   `https://your-custom-domain.com/auth/twitch/callback`

## How Manual Entry Still Works

The manual Twitch channel name entry works because:
- It uses the Twitch embed player directly
- No OAuth required
- Just embeds the public stream

However, automatic webhook detection requires OAuth connection:
- Twitch needs permission to send webhooks
- Access token required for API calls
- EventSub subscriptions need authorization

## Summary

✅ Code updated to use dynamic redirect URLs  
⚠️ **ACTION REQUIRED:** Add redirect URLs to Twitch app settings  
✅ Will work on both preview and production once configured  

After adding the redirect URLs to your Twitch application, the OAuth flow will work correctly!
