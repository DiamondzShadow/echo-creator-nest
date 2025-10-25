-- Fix search_path for increment_asset_views function
CREATE OR REPLACE FUNCTION public.increment_asset_views()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.assets
  SET views = views + 1
  WHERE id = NEW.asset_id;
  RETURN NEW;
END;
$function$;

-- Fix search_path for update_asset_likes function
CREATE OR REPLACE FUNCTION public.update_asset_likes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.assets
    SET likes = likes + 1
    WHERE id = NEW.asset_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.assets
    SET likes = GREATEST(0, likes - 1)
    WHERE id = OLD.asset_id;
  END IF;
  RETURN NULL;
END;
$function$;