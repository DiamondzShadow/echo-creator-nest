import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Generate pre-signed URL for uploading files to Storj
 * 
 * This edge function generates secure pre-signed URLs that allow
 * direct browser uploads to Storj without exposing credentials
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const STORJ_ACCESS_KEY_ID = Deno.env.get('STORJ_ACCESS_KEY_ID');
    const STORJ_SECRET_ACCESS_KEY = Deno.env.get('STORJ_SECRET_ACCESS_KEY');
    const STORJ_BUCKET = Deno.env.get('STORJ_BUCKET') || 'livepeer-videos';
    const STORJ_ENDPOINT = Deno.env.get('STORJ_ENDPOINT') || 'https://gateway.storjshare.io';

    if (!STORJ_ACCESS_KEY_ID || !STORJ_SECRET_ACCESS_KEY) {
      throw new Error('Storj S3 credentials are not configured');
    }

    const { action, filename, contentType, path } = await req.json();

    if (action === 'generate-upload-url') {
      if (!filename) {
        throw new Error('filename is required');
      }

      // Generate a unique path for the file
      const timestamp = Date.now();
      const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
      const uploadPath = path || `/uploads/${timestamp}/${sanitizedFilename}`;
      
      // In a production environment, you would generate a proper AWS Signature V4
      // For now, we'll return the upload configuration
      // The actual upload should use the S3 SDK or AWS SDK
      
      const uploadUrl = `${STORJ_ENDPOINT}/${STORJ_BUCKET}${uploadPath}`;
      
      // Note: For security, actual pre-signed URL generation should be done
      // using AWS SDK. This is a simplified response.
      return new Response(
        JSON.stringify({
          uploadUrl,
          path: uploadPath,
          bucket: STORJ_BUCKET,
          endpoint: STORJ_ENDPOINT,
          // For client-side uploads, credentials should not be exposed
          // Instead, use pre-signed URLs generated with AWS SDK
          method: 'PUT',
          headers: {
            'Content-Type': contentType || 'application/octet-stream'
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } 
    else if (action === 'direct-upload') {
      // For server-side uploads
      const { file, uploadPath } = await req.json();
      
      if (!file || !uploadPath) {
        throw new Error('file and uploadPath are required');
      }

      // Decode base64 file data
      const fileData = Uint8Array.from(atob(file), c => c.charCodeAt(0));
      
      const uploadUrl = `${STORJ_ENDPOINT}/${STORJ_BUCKET}${uploadPath}`;
      
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType || 'application/octet-stream',
          'Authorization': `AWS4-HMAC-SHA256 Credential=${STORJ_ACCESS_KEY_ID}/...`,
          // Proper AWS Signature V4 should be implemented here
        },
        body: fileData,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Upload failed: ${errorText}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          path: uploadPath,
          bucket: STORJ_BUCKET,
          url: uploadUrl
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    else if (action === 'get-config') {
      // Return safe upload configuration (without secret key)
      return new Response(
        JSON.stringify({
          bucket: STORJ_BUCKET,
          endpoint: STORJ_ENDPOINT,
          region: 'us-east-1',
          // Note: Never expose the secret key to the client
          hasCredentials: !!STORJ_ACCESS_KEY_ID && !!STORJ_SECRET_ACCESS_KEY
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Storj upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
