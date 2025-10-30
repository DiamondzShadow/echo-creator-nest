-- Add RLS policy to allow users to upload video thumbnails
CREATE POLICY "Users can upload video thumbnails"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = 'thumbnails'
);

-- Add RLS policy to allow users to update their video thumbnails
CREATE POLICY "Users can update video thumbnails"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = 'thumbnails'
);

-- Add RLS policy to allow public read access to thumbnails
CREATE POLICY "Anyone can view video thumbnails"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = 'thumbnails'
);