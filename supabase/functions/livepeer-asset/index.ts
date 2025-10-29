import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const livepeerApiKey = Deno.env.get('LIVEPEER_API_KEY');
    if (!livepeerApiKey) {
      throw new Error('LIVEPEER_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { action, name, url, assetId, enableIPFS } = await req.json();

    console.log('Livepeer asset action:', action);

    // Create asset for upload
    if (action === 'create-upload') {
      const response = await fetch('https://livepeer.studio/api/asset/request-upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${livepeerApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name || 'Untitled Video',
          ...(enableIPFS && {
            storage: {
              ipfs: true,
            },
          }),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Livepeer create upload error:', error);
        throw new Error(`Failed to create upload: ${error}`);
      }

      const data = await response.json();
      console.log('Upload URL created:', data.asset.id);

      // Store asset in database
      const { error: dbError } = await supabase
        .from('assets')
        .insert({
          user_id: user.id,
          title: name || 'Untitled Video',
          livepeer_asset_id: data.asset.id,
          livepeer_playback_id: data.asset.playbackId,
          status: 'waiting',
        });

      if (dbError) {
        console.error('Database error:', dbError);
      }

      return new Response(
        JSON.stringify({
          uploadUrl: data.url,
          assetId: data.asset.id,
          playbackId: data.asset.playbackId,
          tusEndpoint: data.tusEndpoint,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Import asset from URL (e.g., IPFS)
    if (action === 'import-url') {
      const response = await fetch('https://livepeer.studio/api/asset/import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${livepeerApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name || 'Imported Video',
          url: url,
          ...(enableIPFS && {
            storage: {
              ipfs: true,
            },
          }),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Livepeer import error:', error);
        throw new Error(`Failed to import asset: ${error}`);
      }

      const data = await response.json();
      console.log('Asset imported:', data.asset.id);

      // Store asset in database
      const { error: dbError } = await supabase
        .from('assets')
        .insert({
          user_id: user.id,
          title: name || 'Imported Video',
          livepeer_asset_id: data.asset.id,
          livepeer_playback_id: data.asset.playbackId,
          status: 'processing',
        });

      if (dbError) {
        console.error('Database error:', dbError);
      }

      return new Response(
        JSON.stringify({
          assetId: data.asset.id,
          playbackId: data.asset.playbackId,
          status: data.asset.status,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get asset status
    if (action === 'get-status') {
      const response = await fetch(`https://livepeer.studio/api/asset/${assetId}`, {
        headers: {
          'Authorization': `Bearer ${livepeerApiKey}`,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Livepeer get status error:', error);
        throw new Error(`Failed to get asset status: ${error}`);
      }

      const data = await response.json();
      console.log('Asset status:', data.status.phase);

      // Update database
      const updateData: Record<string, unknown> = {
        status: data.status.phase,
        updated_at: new Date().toISOString(),
      };

      if (data.status.phase === 'ready') {
        updateData.ready_at = new Date().toISOString();
        updateData.duration = data.videoSpec?.duration;
        updateData.size = data.size;
        
        // Add thumbnail URL - Livepeer auto-generates thumbnails
        if (data.playbackId) {
          updateData.thumbnail_url = `https://livepeer.studio/api/playback/${data.playbackId}/thumbnail.jpg`;
          console.log('Thumbnail URL set:', updateData.thumbnail_url);
        }
      }

      // Add IPFS URL if available
      if (data.storage?.ipfs?.cid) {
        updateData.ipfs_cid = data.storage.ipfs.cid;
        updateData.ipfs_url = data.storage.ipfs.url;
        updateData.ipfs_gateway_url = data.storage.ipfs.gatewayUrl || `https://ipfs.io/ipfs/${data.storage.ipfs.cid}`;
        console.log('IPFS data available:', data.storage.ipfs.cid);
      }

      await supabase
        .from('assets')
        .update(updateData)
        .eq('livepeer_asset_id', assetId);

      return new Response(
        JSON.stringify({
          status: data.status.phase,
          progress: data.status.progress,
          playbackId: data.playbackId,
          ipfs: data.storage?.ipfs,
          videoSpec: data.videoSpec,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get playback info
    if (action === 'get-playback') {
      const playbackId = assetId; // Can be asset ID or playback ID
      const response = await fetch(`https://livepeer.studio/api/playback/${playbackId}`, {
        headers: {
          'Authorization': `Bearer ${livepeerApiKey}`,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Livepeer playback error:', error);
        throw new Error(`Failed to get playback info: ${error}`);
      }

      const data = await response.json();

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete asset
    if (action === 'delete') {
      const response = await fetch(`https://livepeer.studio/api/asset/${assetId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${livepeerApiKey}`,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Livepeer delete error:', error);
        throw new Error(`Failed to delete asset: ${error}`);
      }

      // Delete from database
      await supabase
        .from('assets')
        .delete()
        .eq('livepeer_asset_id', assetId)
        .eq('user_id', user.id);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (error) {
    console.error('Error in livepeer-asset function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
