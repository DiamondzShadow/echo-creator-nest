import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    console.log('Livepeer webhook received:', JSON.stringify(body, null, 2));

    // Handle asset.ready event - when video processing is complete
    if (body.event === 'asset.ready' && body.payload?.asset) {
      const asset = body.payload.asset;
      console.log('Processing asset.ready event for:', asset.id);

      // Update asset in database with IPFS info if available
      const updateData: Record<string, unknown> = {
        status: 'ready',
        ready_at: new Date().toISOString(),
        livepeer_playback_id: asset.playbackId,
      };

      // Add thumbnail URL - Livepeer auto-generates thumbnails
      if (asset.playbackId) {
        updateData.thumbnail_url = `https://livepeer.studio/api/playback/${asset.playbackId}/thumbnail.jpg`;
        console.log('Thumbnail URL set:', updateData.thumbnail_url);
      }

      // Add video duration if available
      if (asset.videoSpec?.duration) {
        updateData.duration = asset.videoSpec.duration;
      }

      // Add file size if available
      if (asset.size) {
        updateData.size = asset.size;
      }

      // Add IPFS data if available
      if (asset.storage?.ipfs) {
        updateData.ipfs_cid = asset.storage.ipfs.cid;
        updateData.ipfs_url = asset.storage.ipfs.url;
        updateData.ipfs_gateway_url = asset.storage.ipfs.gatewayUrl || `https://ipfs.io/ipfs/${asset.storage.ipfs.cid}`;
        updateData.storage_provider = 'ipfs';
        console.log('IPFS data available:', updateData.ipfs_cid);
      }

      const { error } = await supabase
        .from('assets')
        .update(updateData)
        .eq('livepeer_asset_id', asset.id);

      if (error) {
        console.error('Error updating asset:', error);
        throw error;
      }

      console.log('Asset updated successfully with IPFS data');
    }

    // Handle asset.failed event
    if (body.event === 'asset.failed' && body.payload?.asset) {
      const asset = body.payload.asset;
      console.log('Processing asset.failed event for:', asset.id);

      const { error } = await supabase
        .from('assets')
        .update({ 
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('livepeer_asset_id', asset.id);

      if (error) {
        console.error('Error updating failed asset:', error);
        throw error;
      }
    }

    // Handle stream.started event
    if (body.event === 'stream.started' && body.payload?.stream) {
      const stream = body.payload.stream;
      console.log('Processing stream.started event for:', stream.id);

      const { error } = await supabase
        .from('live_streams')
        .update({
          is_live: true,
          started_at: new Date().toISOString()
        })
        .eq('livepeer_stream_id', stream.id);

      if (error) {
        console.error('Error updating stream start:', error);
      }
    }

    // Handle stream.idle event - stream has ended
    if (body.event === 'stream.idle' && body.payload?.stream) {
      const stream = body.payload.stream;
      console.log('Processing stream.idle event for:', stream.id);

      const { error } = await supabase
        .from('live_streams')
        .update({
          is_live: false,
          ended_at: new Date().toISOString()
        })
        .eq('livepeer_stream_id', stream.id);

      if (error) {
        console.error('Error updating stream end:', error);
      }
    }

    return new Response(
      JSON.stringify({ success: true, event: body.event }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});