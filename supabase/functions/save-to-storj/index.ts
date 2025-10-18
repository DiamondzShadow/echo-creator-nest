import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Save stream recordings from Livepeer to Storj for permanent decentralized storage
 * 
 * This function:
 * 1. Downloads the recording from Livepeer
 * 2. Uploads it to Storj bucket
 * 3. Updates the asset record with Storj URL
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Supabase auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { assetId } = await req.json();
    
    if (!assetId) {
      throw new Error('Asset ID is required');
    }

    console.log(`Processing save to Storj for asset: ${assetId}`);

    // Get asset details from database
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('*')
      .eq('id', assetId)
      .single();

    if (assetError || !asset) {
      throw new Error('Asset not found');
    }

    // Verify user owns this asset
    if (asset.user_id !== user.id) {
      throw new Error('Forbidden: You do not own this asset');
    }

    // Check if asset is ready
    if (asset.status !== 'ready') {
      throw new Error('Asset is not ready yet. Wait for processing to complete.');
    }

    // Get Livepeer playback URL
    const playbackId = asset.livepeer_playback_id;
    if (!playbackId) {
      throw new Error('No playback ID found for asset');
    }

    const livepeerUrl = `https://livepeer.studio/api/playback/${playbackId}`;
    console.log(`Downloading from Livepeer: ${livepeerUrl}`);

    // Get Storj credentials
    const STORJ_ACCESS_KEY_ID = Deno.env.get('STORJ_ACCESS_KEY_ID');
    const STORJ_SECRET_ACCESS_KEY = Deno.env.get('STORJ_SECRET_ACCESS_KEY');
    const STORJ_BUCKET = Deno.env.get('STORJ_BUCKET') || 'livepeer-videos';
    const STORJ_ENDPOINT = Deno.env.get('STORJ_ENDPOINT') || 'https://gateway.storjshare.io';

    if (!STORJ_ACCESS_KEY_ID || !STORJ_SECRET_ACCESS_KEY) {
      throw new Error('Storj credentials not configured');
    }

    // Download video from Livepeer
    console.log('Downloading video from Livepeer...');
    const livepeerResponse = await fetch(livepeerUrl);
    
    if (!livepeerResponse.ok) {
      throw new Error(`Failed to download from Livepeer: ${livepeerResponse.statusText}`);
    }

    const videoData = await livepeerResponse.arrayBuffer();
    console.log(`Downloaded ${videoData.byteLength} bytes`);

    // Generate Storj path
    const timestamp = Date.now();
    const filename = `${asset.title.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.mp4`;
    const storjPath = `/recordings/${user.id}/${filename}`;
    
    // Upload to Storj using S3-compatible API
    // Note: This is simplified. In production, use AWS SDK for proper S3 uploads
    const uploadUrl = `${STORJ_ENDPOINT}/${STORJ_BUCKET}${storjPath}`;
    
    console.log(`Uploading to Storj: ${uploadUrl}`);
    
    // For now, we'll use basic PUT. In production, implement proper S3 multipart upload
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': videoData.byteLength.toString(),
        // Note: Proper AWS Signature V4 should be implemented here
        // This is a simplified version
      },
      body: videoData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Upload error:', errorText);
      throw new Error(`Failed to upload to Storj: ${uploadResponse.statusText}`);
    }

    console.log('Upload successful');

    // Update asset record with Storj info
    const storjUrl = `${STORJ_ENDPOINT}/${STORJ_BUCKET}${storjPath}`;
    const { error: updateError } = await supabase
      .from('assets')
      .update({
        // Add a metadata column to store additional info
        description: asset.description 
          ? `${asset.description}\n\nStored on Storj: ${storjUrl}`
          : `Stored on Storj: ${storjUrl}`,
      })
      .eq('id', assetId);

    if (updateError) {
      console.error('Error updating asset:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Recording saved to Storj successfully',
        storjUrl,
        path: storjPath,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Save to Storj error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        success: false,
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
