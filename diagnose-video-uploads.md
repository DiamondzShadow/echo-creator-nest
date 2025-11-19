# Video Upload Diagnostics Report

## Issue: Video uploads showing "Failed" status

### Root Causes Identified:

#### 1. **LIVEPEER_API_KEY Not Configured** (Most Likely)
The `livepeer-asset` Supabase Edge Function requires the LIVEPEER_API_KEY to be set in Supabase secrets.

**Check:**
```bash
# In your Supabase dashboard:
Settings → Edge Functions → Secrets
```

Look for: `LIVEPEER_API_KEY`

**If missing, follow these steps:**

1. Get your Livepeer API key:
   - Go to https://livepeer.studio
   - Sign in
   - Dashboard → Developers → API Keys
   - Create a new API key or copy existing one

2. Set it in Supabase:
   ```bash
   # Option A: Using Supabase Dashboard
   - Go to Settings → Edge Functions → Secrets
   - Click "Add Secret"
   - Name: LIVEPEER_API_KEY
   - Value: [paste your Livepeer API key]
   - Click Save
   
   # Option B: Using Supabase CLI
   supabase secrets set LIVEPEER_API_KEY=your_livepeer_api_key_here
   ```

3. Redeploy the edge function:
   ```bash
   supabase functions deploy livepeer-asset
   supabase functions deploy refresh-asset-status
   ```

#### 2. **Database Status Constraint Issue**
Some databases might still have the old status constraint that doesn't include 'waiting' status.

**Fix:**
Run this SQL in your Supabase SQL Editor:

```sql
-- Drop and recreate the constraint with all valid statuses
ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_status_check;
ALTER TABLE assets ADD CONSTRAINT assets_status_check 
  CHECK (status IN ('waiting', 'processing', 'ready', 'failed', 'deleting', 'deleted'));

-- Update any failed uploads back to waiting to retry
UPDATE assets 
SET status = 'waiting' 
WHERE status = 'failed' 
  AND created_at > NOW() - INTERVAL '1 hour';
```

#### 3. **Livepeer API Connection Issues**
If the API key is set but uploads still fail, check for:

- Network connectivity issues
- Invalid API key
- Livepeer service issues

**Verify Livepeer API Key:**
```bash
# Test your Livepeer API key
curl -X GET https://livepeer.studio/api/stream \
  -H "Authorization: Bearer YOUR_LIVEPEER_API_KEY"

# Should return 200 OK with a list of streams
# If it returns 401/403, your API key is invalid
```

### Quick Fix Steps:

1. **Set LIVEPEER_API_KEY in Supabase** (see step 1 above)
2. **Run the SQL fix** (see step 2 above)
3. **Redeploy functions:**
   ```bash
   supabase functions deploy livepeer-asset
   supabase functions deploy refresh-asset-status
   ```
4. **Test upload again**

### How to Test After Fix:

1. Go to your app → `/videos` page
2. Click "Upload" tab
3. Fill in:
   - Title: "Test Upload"
   - Select a small video file (< 50MB for testing)
4. Click "Upload Video"
5. Watch the progress bar
6. Check status - should show "Processing" then "Ready"

### Common Error Messages and Solutions:

| Error Message | Cause | Solution |
|---------------|-------|----------|
| "LIVEPEER_API_KEY not configured" | Missing API key in Supabase secrets | Add LIVEPEER_API_KEY to Supabase secrets |
| "Failed to create upload" | Invalid API key or Livepeer service down | Verify API key, check Livepeer status |
| "Upload failed" during TUS upload | Network issue or file too large | Try smaller file, check network |
| Status stuck at "waiting" | Livepeer not processing | Wait 5 minutes, then click refresh |
| Status shows "failed" immediately | Database constraint or API error | Run SQL fix above, check function logs |

### Check Function Logs:

To see detailed error messages:

1. Go to Supabase Dashboard
2. Navigate to Edge Functions
3. Click on `livepeer-asset`
4. View logs
5. Look for error messages starting with "Error in livepeer-asset function:"

### Still Not Working?

If after following all steps above, uploads still fail:

1. **Check Edge Function Logs:**
   - Supabase Dashboard → Edge Functions → livepeer-asset → Logs
   - Look for specific error messages

2. **Verify Database Table:**
   ```sql
   -- Check if assets table exists and has correct columns
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'assets';
   ```

3. **Test with smallest possible video:**
   - Try uploading a 5-second, low-quality video
   - This isolates file size/quality issues

4. **Check browser console:**
   - F12 → Console tab
   - Look for red error messages during upload

### Prevention:

To prevent this issue in the future:

1. Always ensure LIVEPEER_API_KEY is set before deploying
2. Test uploads after any database migration
3. Monitor edge function logs during deployments
4. Keep a list of all required Supabase secrets in your README

### Related Files:
- `/workspace/supabase/functions/livepeer-asset/index.ts` - Main upload handler
- `/workspace/supabase/functions/refresh-asset-status/index.ts` - Status polling
- `/workspace/src/components/LivepeerUpload.tsx` - Frontend upload component
- `/workspace/supabase/migrations/20251029000001_add_deleted_status.sql` - Status constraint fix

---

## Next Steps:

Run through the "Quick Fix Steps" above in order. If you need help with any step, let me know!
