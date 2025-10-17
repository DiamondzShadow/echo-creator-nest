-- Create a function to securely store stream credentials
CREATE OR REPLACE FUNCTION public.store_stream_key(
  p_stream_id uuid,
  p_stream_key text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  -- Verify the user owns the stream
  IF NOT EXISTS (
    SELECT 1 FROM public.live_streams 
    WHERE id = p_stream_id 
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  -- Insert into private schema
  INSERT INTO private.stream_credentials (stream_id, stream_key)
  VALUES (p_stream_id, p_stream_key);
END;
$$;

-- Create a function to retrieve stream credentials
CREATE OR REPLACE FUNCTION public.get_stream_key(p_stream_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_stream_key text;
BEGIN
  -- Verify the user owns the stream
  IF NOT EXISTS (
    SELECT 1 FROM public.live_streams 
    WHERE id = p_stream_id 
    AND user_id = auth.uid()
  ) THEN
    RETURN NULL;
  END IF;
  
  -- Get the stream key
  SELECT stream_key INTO v_stream_key
  FROM private.stream_credentials
  WHERE stream_id = p_stream_id;
  
  RETURN v_stream_key;
END;
$$;