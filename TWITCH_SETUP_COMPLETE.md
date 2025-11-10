# Twitch Integration Setup - Complete Guide

## ✅ Current Status

Your Twitch integration is **almost ready**! The code configuration is correct, but you need to add one secret to Supabase.

## 🔧 What You Need to Do

### Step 1: Add Twitch Client Secret to Supabase

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/woucixqbnzmvlvnaaelb

2. Navigate to **Settings** → **Edge Functions** → **Secrets**

3. Add a new secret:
   - **Name**: `TWITCH_CLIENT_SECRET`
   - **Value**: `fitqshriphdq13pamofhyxnq79534m`

4. Click **Save** or **Add Secret**

### Step 2: (Optional) Set VITE_TWITCH_CLIENT_ID Environment Variable

If you're deploying to production, make sure this environment variable is set in your hosting platform:
- **Name**: `VITE_TWITCH_CLIENT_ID`
- **Value**: `hdm6ufl160ptki0gbht94s57515oyj`

This is already in your `.env` file for local development.

## ✅ Verified Configurations

### 1. Twitch Application Settings ✓
- **Redirect URLs**: 
  - `https://crabbytv.com/auth/twitch/callback` ✓
  - `https://3c573353-c0fb-4125-b052-a56f89c77dfd.lovableproject.com/auth/twitch/callback` ✓
- **Client ID**: `hdm6ufl160ptki0gbht94s57515oyj` ✓
- **Client Type**: Confidential ✓

### 2. Code Configuration ✓
- Redirect URI in code: `https://crabbytv.com/auth/twitch/callback` ✓
- Edge function configured in `supabase/config.toml` ✓
- OAuth flow implemented in `TwitchConnect.tsx` ✓
- Callback handler in `TwitchCallback.tsx` ✓
- Route configured in `App.tsx` ✓

### 3. Database ✓
- `twitch_connections` table exists (verified via edge function code) ✓

## 🎯 How It Works

1. **User clicks "Connect" button** → Redirects to Twitch OAuth
2. **User authorizes on Twitch** → Twitch redirects back with auth code
3. **Frontend receives code** → Sends to edge function
4. **Edge function exchanges code** → Gets access token from Twitch
5. **Edge function fetches user data** → Stores in `twitch_connections` table
6. **Success!** → User sees their connected Twitch account

## 🧪 Testing

After adding the secret:

1. Go to your live site: `https://crabbytv.com` or `https://3c573353-c0fb-4125-b052-a56f89c77dfd.lovableproject.com`
2. Log in to your account
3. Navigate to the page with Twitch connect (likely Settings or Live page)
4. Click the "Connect" button
5. Authorize the application on Twitch
6. You should be redirected back with a success message

## 🐛 Troubleshooting

### Error: "Failed to exchange code for token"
- Make sure `TWITCH_CLIENT_SECRET` is set in Supabase Secrets
- Verify the redirect URI exactly matches what's in your Twitch app

### Error: "No authorization header"
- Make sure you're logged in to your CrabbyTV account before connecting Twitch

### Error: "redirect_uri_mismatch"
- Verify your Twitch app has both redirect URLs configured
- Make sure there are no trailing slashes or typos

## 📝 Scopes Requested

Your app requests these Twitch permissions:
- `user:read:email` - Read user email address
- `channel:read:stream_key` - Read channel stream key (for streaming features)

## 🔐 Security Notes

- Client Secret is stored securely in Supabase Edge Function environment
- Access tokens are stored encrypted in your database
- Refresh tokens are stored for automatic token renewal
- All API calls require user authentication

## 📚 Files Modified/Verified

- ✅ `supabase/functions/twitch-oauth/index.ts` - OAuth handler
- ✅ `src/components/TwitchConnect.tsx` - Connect UI component
- ✅ `src/pages/TwitchCallback.tsx` - OAuth callback handler
- ✅ `src/App.tsx` - Route configuration
- ✅ `supabase/config.toml` - Edge function settings
- ✅ `.env` - Environment variables

## 🎉 Next Steps

Once you've added the secret to Supabase:
1. Test the connection flow
2. The Twitch connect button should work seamlessly
3. Users will be able to link their Twitch accounts
4. You can use the stored credentials for Twitch API calls

---

**Need Help?** Check the Supabase logs if you encounter any issues:
```bash
npx supabase functions logs twitch-oauth
```
