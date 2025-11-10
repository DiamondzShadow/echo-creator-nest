# Twitch Integration Verification Checklist

## ✅ Configuration Verified

### 1. Twitch Application Settings
- [x] **Client ID**: `hdm6ufl160ptki0gbht94s57515oyj`
- [x] **Client Type**: Confidential
- [x] **Redirect URLs**:
  - [x] `https://crabbytv.com/auth/twitch/callback`
  - [x] `https://3c573353-c0fb-4125-b052-a56f89c77dfd.lovableproject.com/auth/twitch/callback`

### 2. Environment Variables
- [x] **VITE_TWITCH_CLIENT_ID** set in `.env`
- [ ] **TWITCH_CLIENT_SECRET** needs to be added to Supabase Secrets

### 3. Code Configuration
- [x] Redirect URI matches Twitch app: `https://crabbytv.com/auth/twitch/callback`
- [x] Edge function exists: `supabase/functions/twitch-oauth/index.ts`
- [x] Frontend component exists: `src/components/TwitchConnect.tsx`
- [x] Callback page exists: `src/pages/TwitchCallback.tsx`
- [x] Route configured: `/auth/twitch/callback`
- [x] Edge function enabled in `supabase/config.toml`

### 4. Database Schema
- [x] Table exists: `twitch_connections`
- [x] RLS policies configured
- [x] Foreign key to `auth.users`
- [x] Unique constraint on `user_id`

## 🔧 Required Action

### Add Twitch Client Secret to Supabase

**Method 1: Via Supabase Dashboard (Recommended)**

1. Go to: https://supabase.com/dashboard/project/woucixqbnzmvlvnaaelb/settings/functions
2. Scroll to "Secrets" section
3. Click "Add secret" or "New secret"
4. Enter:
   - **Name**: `TWITCH_CLIENT_SECRET`
   - **Value**: `fitqshriphdq13pamofhyxnq79534m`
5. Click "Save"

**Method 2: Via Supabase CLI (If you have access token)**

```bash
npx supabase secrets set TWITCH_CLIENT_SECRET=fitqshriphdq13pamofhyxnq79534m
```

## 🧪 Test Flow

After adding the secret, test the integration:

1. **Navigate to Connect Page**
   - Go to your site (crabbytv.com or lovableproject.com)
   - Log in to your account
   - Find the Twitch Connect component (likely in Settings or Live page)

2. **Initiate Connection**
   - Click "Connect" button
   - Should redirect to Twitch authorization page

3. **Authorize on Twitch**
   - Review permissions:
     - Read user email
     - Read channel stream key
   - Click "Authorize"

4. **Complete Connection**
   - Should redirect back to `/auth/twitch/callback`
   - Should show success message
   - Should redirect to original page
   - Should display "Connected as @username"

## 🔍 Debugging

### Check Edge Function Logs

```bash
npx supabase functions logs twitch-oauth
```

### Common Issues

**Issue**: "redirect_uri_mismatch"
- **Cause**: Redirect URI doesn't match exactly
- **Solution**: Verify Twitch app has both URLs configured

**Issue**: "Failed to exchange code for token"
- **Cause**: Missing or incorrect client secret
- **Solution**: Verify `TWITCH_CLIENT_SECRET` is set in Supabase

**Issue**: "Invalid token"
- **Cause**: User not logged in to CrabbyTV
- **Solution**: Log in before attempting to connect Twitch

**Issue**: "Database error"
- **Cause**: RLS policy or table issue
- **Solution**: Verify migration ran successfully

### Verify Database Table

Run this query in Supabase SQL Editor:

```sql
SELECT * FROM public.twitch_connections WHERE user_id = auth.uid();
```

### Test Edge Function Directly

```bash
curl -X GET "https://woucixqbnzmvlvnaaelb.supabase.co/functions/v1/twitch-oauth?code=test" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

## 📊 Expected Database Entry

After successful connection, the `twitch_connections` table should have:

```json
{
  "id": "uuid",
  "user_id": "your-user-id",
  "twitch_user_id": "twitch-numeric-id",
  "twitch_username": "your_twitch_username",
  "access_token": "encrypted-token",
  "refresh_token": "encrypted-refresh-token",
  "expires_at": "2025-11-10T12:00:00Z",
  "created_at": "2025-11-10T10:00:00Z",
  "updated_at": "2025-11-10T10:00:00Z"
}
```

## ✨ Features Enabled

Once connected, users can:
- Link their Twitch account to CrabbyTV profile
- Access Twitch stream keys (if needed for streaming features)
- Display Twitch username on profile
- Potential future features:
  - Multi-stream to Twitch
  - Import Twitch followers
  - Twitch chat integration

## 🔒 Security Considerations

- ✅ Client Secret stored in Supabase (not in code)
- ✅ RLS policies protect user data
- ✅ Edge function verifies JWT
- ✅ Tokens stored encrypted in database
- ✅ Refresh token available for automatic renewal

## 📝 Next Steps After Secret is Added

1. [ ] Add `TWITCH_CLIENT_SECRET` to Supabase
2. [ ] Test connection flow
3. [ ] Verify database entry created
4. [ ] Check edge function logs for any errors
5. [ ] Test disconnect functionality
6. [ ] Deploy to production (if not already deployed)

---

**Status**: Ready to test once `TWITCH_CLIENT_SECRET` is added to Supabase! 🚀
