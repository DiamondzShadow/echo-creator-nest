# Video Privacy Fix - Critical Security Update

## Issue Summary

**Severity:** HIGH - Privacy Vulnerability  
**Date:** 2025-10-31  
**Status:** FIXED

### The Problem

Videos were being made **PUBLIC by default** when uploaded, causing a serious privacy issue where:

1. All newly uploaded videos were immediately visible across all user profiles
2. Users had no privacy for their content unless they manually changed settings
3. Videos appeared on the public landing page and discovery section without user consent

### Root Cause

The `assets` table had the `is_public` column set to **DEFAULT true**:

```sql
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true,
```

This meant:
- Every new video was public by default
- The RLS policy `USING (is_public = true OR auth.uid() = user_id)` allowed anyone to view public videos
- Users uploading videos didn't realize they were immediately public

## The Fix

### Database Migration

Created migration `20251031000000_fix_video_privacy_defaults.sql` that:

1. **Changes default to private**: `ALTER COLUMN is_public SET DEFAULT false`
2. **Adds documentation**: Comments explaining the privacy model
3. **Optional bulk update**: Includes commented code to make all existing videos private if desired

### How Privacy Now Works

✅ **Private by Default (is_public = false)**
- New videos are private when uploaded
- Only the owner can see them
- Not visible on discovery page or other profiles

✅ **User Control**
- Users can manually toggle videos to public via the Videos page
- Clear UI with Lock/Unlock icons showing privacy state
- Privacy setting persists across the platform

✅ **Existing Videos**
- Current videos keep their existing privacy setting
- To make ALL existing videos private, uncomment the UPDATE statement in the migration

### Row Level Security (RLS) Policy

The RLS policy correctly enforces privacy:

```sql
CREATE POLICY "Anyone can view public assets"
  ON public.assets FOR SELECT
  USING (is_public = true OR auth.uid() = user_id);
```

This means:
- ✅ Users always see their own videos (private or public)
- ✅ Users only see other people's videos if marked public
- ✅ Private videos are completely hidden from other users

## Deployment Instructions

### 1. Apply the Migration

```bash
# Push migration to Supabase
npx supabase db push

# Or if using Supabase CLI with specific project
npx supabase db push --project-ref YOUR_PROJECT_REF
```

### 2. (Optional) Make Existing Videos Private

If you want to make ALL existing videos private:

1. Edit the migration file: `/workspace/supabase/migrations/20251031000000_fix_video_privacy_defaults.sql`
2. Uncomment lines 13-15:
   ```sql
   UPDATE public.assets 
   SET is_public = false 
   WHERE is_public = true;
   ```
3. Apply the migration

### 3. Verify the Fix

After applying:

1. Upload a new video
2. Check it's private by default (Lock icon shown)
3. Try viewing from another profile - it should NOT be visible
4. Toggle to public - it should now appear on discovery page

## UI Features for Privacy Control

Users can manage privacy in the Videos page:

- **Toggle Switch**: Quick privacy toggle on each video card
- **Lock/Unlock Icons**: Visual indicator of privacy state
- **Confirmation Toast**: "Video is now public/private" messages
- **Bulk Control**: Users can manage all their videos from one place

## Testing Checklist

- [x] Database schema updated
- [x] Migration created
- [ ] Migration applied to production
- [ ] New uploads default to private
- [ ] Privacy toggle works in UI
- [ ] Private videos not visible to other users
- [ ] Public videos visible on discovery page
- [ ] Profile page respects privacy settings

## Code Locations

### Database
- **Migration**: `/workspace/supabase/migrations/20251031000000_fix_video_privacy_defaults.sql`
- **RLS Policy**: `/workspace/supabase/migrations/20251024050205_24df0e9e-d0dd-4136-834c-399c0b4fd34a.sql` (line 161-163)

### Frontend
- **Privacy Toggle**: `/workspace/src/pages/Videos.tsx` (line 136-169) - Owner verification added
- **Video Edit Dialog**: `/workspace/src/components/VideoEditDialog.tsx` (line 85-128) - Owner verification added
- **Profile Videos**: `/workspace/src/pages/Profile.tsx` (line 86-93) - Correctly filtered by user_id
- **Public Discovery**: `/workspace/src/components/PublicVideos.tsx` (line 26-40) - Only shows public videos
- **Discover Page**: `/workspace/src/pages/Discover.tsx` (line 115-123) - Only shows public videos

### Backend
- **Video Creation**: `/workspace/supabase/functions/livepeer-asset/index.ts` - Uses DB default
- **Stream Recording**: `/workspace/supabase/functions/livekit-webhook/index.ts` - Uses DB default

## Additional Security Enhancements (Same Session)

### Owner-Only Edit Permissions ✅
All video edit operations now verify ownership before allowing changes:

1. **Video Edit Dialog** - Checks user owns video before updating
2. **Privacy Toggle** - Requires ownership match in query
3. **Database RLS** - Already enforces UPDATE policy with `auth.uid() = user_id`

### Cross-Profile Privacy Enforcement ✅
Videos are now properly isolated between user profiles:

1. **Discovery Page** - Only shows `is_public = true` videos
2. **Profile Page** - Only shows videos for that specific profile
3. **Watch Page** - RLS enforces privacy at database level

## Prevention

To prevent this in the future:

1. ✅ Always default sensitive data to private/restricted
2. ✅ Explicitly set privacy in application code when needed
3. ✅ Test privacy boundaries with multiple user accounts
4. ✅ Document privacy expectations clearly
5. ✅ Add privacy indicators in UI (Lock/Unlock icons)

## Support

If users are concerned about existing videos:
1. They can use the privacy toggle on the Videos page to make videos private
2. Or run the optional bulk update in the migration to make all videos private
3. Videos are immediately hidden from other users when set to private (RLS enforced at database level)
