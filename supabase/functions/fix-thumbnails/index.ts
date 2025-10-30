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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all assets without thumbnails that are ready
    const { data: assets, error: fetchError } = await supabase
      .from('assets')
      .select('id, livepeer_playback_id, title, thumbnail_url')
      .eq('status', 'ready')
      .not('livepeer_playback_id', 'is', null);

    if (fetchError) {
      console.error('Error fetching assets:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${assets?.length || 0} ready assets with playback IDs`);

    if (!assets || assets.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No assets found with playback IDs', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter assets that need thumbnail updates (null or empty thumbnail_url)
    const assetsNeedingThumbnails = assets.filter(asset => 
      !asset.thumbnail_url || asset.thumbnail_url.trim() === ''
    );

    console.log(`${assetsNeedingThumbnails.length} assets need thumbnail updates`);

    if (assetsNeedingThumbnails.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'All assets already have thumbnails', 
          count: 0,
          total: assets.length 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update each asset with thumbnail URL
    let updatedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const asset of assetsNeedingThumbnails) {
      const thumbnailUrl = `https://livepeer.studio/api/playback/${asset.livepeer_playback_id}/thumbnail.jpg`;
      
      console.log(`Updating asset ${asset.id} (${asset.title}) with thumbnail: ${thumbnailUrl}`);
      
      const { error: updateError } = await supabase
        .from('assets')
        .update({ thumbnail_url: thumbnailUrl })
        .eq('id', asset.id);

      if (updateError) {
        errorCount++;
        const errorMsg = `Error updating asset ${asset.id}: ${updateError.message}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      } else {
        updatedCount++;
        console.log(`✓ Updated thumbnail for asset ${asset.id}: ${asset.title}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Updated ${updatedCount} out of ${assetsNeedingThumbnails.length} assets`,
        updated: updatedCount,
        errors: errorCount,
        errorMessages: errors,
        totalReady: assets.length,
        needingUpdate: assetsNeedingThumbnails.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fix-thumbnails function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
