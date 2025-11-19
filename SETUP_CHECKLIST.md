# Video Upload Fix - Quick Checklist

## Your API Key
```
cce5db20-dca1-4554-9805-de58abb3199e
```

---

## ☐ Step 1: Set Supabase Secret (2 min)

**Location**: https://supabase.com/dashboard  
→ Your Project → Settings → Edge Functions → Secrets

**Action**: Add Secret
- Name: `LIVEPEER_API_KEY`
- Value: `cce5db20-dca1-4554-9805-de58abb3199e`
- Click Save

---

## ☐ Step 2: Run SQL Fix (1 min)

**Location**: Supabase Dashboard → SQL Editor → New Query

**SQL to Run**:
```sql
ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_status_check;
ALTER TABLE assets ADD CONSTRAINT assets_status_check 
  CHECK (status IN ('waiting', 'processing', 'ready', 'failed', 'deleting', 'deleted'));

UPDATE assets 
SET status = 'waiting', updated_at = NOW()
WHERE status = 'failed' AND created_at > NOW() - INTERVAL '1 hour';
```

---

## ☐ Step 3: Wait 2 Minutes

Supabase needs time to propagate the secret to edge functions.

---

## ☐ Step 4: Test Upload

1. Go to: `/videos` page in your app
2. Click "Upload" tab
3. Upload small test video (< 50MB)
4. Watch for: Uploading → Processing → Ready ✅

---

## ✅ Success Indicators:

- [ ] Progress bar completes (100%)
- [ ] Status shows "Processing" 
- [ ] Status changes to "Ready" with green checkmark
- [ ] Thumbnail appears
- [ ] Video plays when clicked
- [ ] No "Failed" status

---

## 🚨 If Still Failing:

1. **Verify secret is set**: Dashboard → Edge Functions → Secrets (should see LIVEPEER_API_KEY)
2. **Wait longer**: Give it 3-5 minutes total
3. **Check logs**: Dashboard → Edge Functions → livepeer-asset → Logs
4. **Try smaller file**: Use a 5-second video under 10MB
5. **Check browser console**: Press F12, look for errors

---

## 📞 Get Help:

See detailed troubleshooting in: `YOUR_SETUP_STEPS.md`
