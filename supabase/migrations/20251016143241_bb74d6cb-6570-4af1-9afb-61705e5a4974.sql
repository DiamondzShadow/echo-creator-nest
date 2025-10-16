-- Create followers table to track relationships
CREATE TABLE public.followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Enable RLS
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;

-- Everyone can view followers
CREATE POLICY "Everyone can view followers"
ON public.followers
FOR SELECT
USING (true);

-- Users can follow others
CREATE POLICY "Users can follow others"
ON public.followers
FOR INSERT
WITH CHECK (auth.uid() = follower_id);

-- Users can unfollow
CREATE POLICY "Users can unfollow"
ON public.followers
FOR DELETE
USING (auth.uid() = follower_id);

-- Function to update follower counts
CREATE OR REPLACE FUNCTION public.update_follower_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment follower count for the person being followed
    UPDATE public.profiles
    SET follower_count = follower_count + 1
    WHERE id = NEW.following_id;
    
    -- Increment following count for the follower
    UPDATE public.profiles
    SET following_count = following_count + 1
    WHERE id = NEW.follower_id;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement follower count
    UPDATE public.profiles
    SET follower_count = GREATEST(0, follower_count - 1)
    WHERE id = OLD.following_id;
    
    -- Decrement following count
    UPDATE public.profiles
    SET following_count = GREATEST(0, following_count - 1)
    WHERE id = OLD.follower_id;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to automatically update counts
CREATE TRIGGER update_follower_counts_trigger
AFTER INSERT OR DELETE ON public.followers
FOR EACH ROW
EXECUTE FUNCTION public.update_follower_counts();

-- Enable realtime for followers
ALTER PUBLICATION supabase_realtime ADD TABLE public.followers;