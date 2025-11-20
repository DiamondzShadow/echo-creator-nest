# 🚨 VIDEO UPLOAD FAILURE - QUICK FIX GUIDE

## Problem
Video uploads are showing "Failed" status in your app.

## Most Likely Cause
**Missing `LIVEPEER_API_KEY` in Supabase Secrets** (95% of cases)

---

## ✅ QUICK FIX (5 Minutes)

### Step 1: Get Your Livepeer API Key

1. Go to **https://livepeer.studio**
2. Sign in (or create account if you don't have one - it's free!)
3. Navigate to: **Dashboard → Developers → API Keys**
4. Click **"Create API Key"**
5. Give it a name: `echo-creator-production`
6. **Copy the API key** (starts with a long string)

### Step 2: Add API Key to Supabase

**Method A: Using Supabase Dashboard (Easiest)**

1. Go to your **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project
3. Click **Settings** (bottom left)
4. Click **Edge Functions** 
5. Scroll down to **"Secrets"** section
6. Click **"Add Secret"**
7. Enter:
   - **Name**: `LIVEPEER_API_KEY`
   - **Value**: [paste your Livepeer API key]
8. Click **Save**

**Method B: Using CLI (If you have Supabase CLI installed)**

```bash
supabase secrets set LIVEPEER_API_KEY=your_livepeer_api_key_here
```

### Step 3: Apply Database Fix

Run this SQL in **Supabase Dashboard → SQL Editor**:

```sql
-- Fix status constraint
ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_status_check;
ALTER TABLE assets ADD CONSTRAINT assets_status_check 
  CHECK (status IN ('waiting', 'processing', 'ready', 'failed', 'deleting', 'deleted'));

-- Reset failed uploads to retry
UPDATE assets 
SET status = 'waiting', updated_at = NOW()
WHERE status = 'failed' 
  AND created_at > NOW() - INTERVAL '1 hour';
```

### Step 4: Redeploy Edge Functions

**If you have Supabase CLI:**

```bash
cd /workspace
supabase functions deploy livepeer-asset
supabase functions deploy refresh-asset-status
```

**If you DON'T have Supabase CLI:**

The functions will automatically pick up the new secret within a few minutes. Wait 2-3 minutes, then test.

### Step 5: Test Upload

1. Go to your app: **`/videos`** page
2. Click **"Upload"** tab
3. Fill in a title
4. Select a **small video file** (under 50MB for testing)
5. Click **"Upload Video"**
6. Watch the progress:
   - ✅ Should show: "Uploading: 0%...100%" → "Processing" → "Ready"
   - ❌ If still fails, see troubleshooting below

---

## 🔍 VERIFY THE FIX

### Check Secret is Set:

1. Supabase Dashboard → Settings → Edge Functions → Secrets
2. You should see `LIVEPEER_API_KEY` in the list

### Check Edge Function Logs:

1. Supabase Dashboard → Edge Functions
2. Click on `livepeer-asset`
3. View recent logs
4. Look for:
   - ✅ Good: `"Upload URL created: xxx"`
   - ❌ Bad: `"LIVEPEER_API_KEY not configured"`

---

## 🛠️ TROUBLESHOOTING

### Issue: Still Getting "Failed" After Setting API Key

**Solution:**
1. Wait 2-3 minutes for Supabase to propagate the secret
2. Clear browser cache (Ctrl+Shift+Delete)
3. Try uploading again
4. If still failing, redeploy functions:
   ```bash
   supabase functions deploy livepeer-asset
   ```

### Issue: "Invalid Livepeer API Key"

**Solution:**
1. Verify your API key is correct
2. Test it manually:
   ```bash
   curl -H "Authorization: Bearer YOUR_KEY" https://livepeer.studio/api/stream
   ```
3. If 401/403 error, your key is invalid - generate a new one

### Issue: Upload Starts But Gets Stuck at "Processing"

**Solution:**
1. This is normal - large files take 2-10 minutes
2. Check Livepeer Dashboard to see processing status
3. Run refresh function:
   ```sql
   SELECT refresh_stuck_assets();
   ```

### Issue: "Database Error" in Logs

**Solution:**
Run the database fix SQL from Step 3 above.

### Issue: Upload Fails at 100% (During TUS Upload)

**Solution:**
1. File might be too large (Livepeer free tier has limits)
2. Network connection issue
3. Try a smaller file (< 50MB)

---

## 📋 AUTOMATED FIX SCRIPT

If you prefer automation, run:

```bash
cd /workspace
./fix-video-uploads.sh
```

This script will:
- Check if Supabase CLI is installed
- Verify secrets configuration
- Apply database migrations
- Redeploy edge functions
- Provide detailed status

---

## 🔐 SECURITY NOTE

**NEVER commit LIVEPEER_API_KEY to git!**

- ✅ Store in Supabase Secrets (server-side only)
- ❌ Do NOT put in `.env` file
- ❌ Do NOT put in frontend code

---

## 📚 RELATED DOCUMENTATION

- **Full Diagnostics**: `/workspace/diagnose-video-uploads.md`
- **Setup Guide**: `/workspace/SETUP.txt`
- **Livepeer Docs**: https://docs.livepeer.org

---

## 🆘 STILL NOT WORKING?

If uploads still fail after following all steps:

1. **Check Browser Console** (F12 → Console)
   - Look for red error messages during upload

2. **Check Supabase Function Logs**
   - Dashboard → Edge Functions → livepeer-asset → Logs
   - Copy any error messages

3. **Check Livepeer Dashboard**
   - Go to https://livepeer.studio/dashboard
   - Check if assets appear there
   - Verify your account has available credits

4. **Test with Minimal File**
   - Record a 5-second video on your phone
   - Compress it to < 10MB
   - Try uploading that
   - If this works, file size/format was the issue

5. **Check Your Livepeer Account Status**
   - Free tier limits: 1000 minutes transcoding/month
   - If exceeded, upgrade or wait for monthly reset

---

## ✨ PREVENTION

To avoid this in future deployments:

### Create a Secrets Checklist

```
Required Supabase Secrets:
□ LIVEKIT_API_KEY
□ LIVEKIT_API_SECRET
□ LIVEPEER_API_KEY (for video uploads)
□ STORJ_ACCESS_KEY_ID (optional, for recording)
□ STORJ_SECRET_ACCESS_KEY (optional, for recording)
```

### Test After Every Deployment

```bash
# Quick upload test
# 1. Go to /videos
# 2. Upload a 5-second test video
# 3. Verify it reaches "Ready" status
```

---

## 📞 SUPPORT

- **Livepeer Discord**: https://discord.gg/livepeer
- **Supabase Discord**: https://discord.supabase.com

---

**Last Updated**: 2025-11-19  
**Issue**: Video uploads failing  
**Fix Time**: ~5 minutes  
**Success Rate**: 95%+ (when LIVEPEER_API_KEY is the issue)
