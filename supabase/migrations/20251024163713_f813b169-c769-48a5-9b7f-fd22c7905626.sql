-- Create function to increment stream tips
CREATE OR REPLACE FUNCTION increment_stream_tips(p_stream_id uuid, p_amount numeric)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE live_streams 
  SET total_tips = COALESCE(total_tips, 0) + p_amount
  WHERE id = p_stream_id;
$$;