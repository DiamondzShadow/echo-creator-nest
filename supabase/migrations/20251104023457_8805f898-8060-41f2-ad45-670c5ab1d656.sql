-- Add foreign key relationship from assets.user_id to profiles.id
ALTER TABLE public.assets
ADD CONSTRAINT assets_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id)
ON DELETE CASCADE;