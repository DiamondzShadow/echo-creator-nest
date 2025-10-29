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
      .select('id, livepeer_playback_id')
      .eq('status', 'ready')
      .is('thumbnail_url', null)
      .not('livepeer_playback_id', 'is', null);

    if (fetchError) {
      console.error('Error fetching assets:', fetchError);
      throw fetchError;
    }

    if (!assets || assets.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No assets need thumbnail updates', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update each asset with thumbnail URL
    let updatedCount = 0;
    for (const asset of assets) {
      const thumbnailUrl = `https://livepeer.studio/api/playback/${asset.livepeer_playback_id}/thumbnail.jpg`;
      
      const { error: updateError } = await supabase
        .from('assets')
        .update({ thumbnail_url: thumbnailUrl })
        .eq('id', asset.id);

      if (updateError) {
        console.error(`Error updating asset ${asset.id}:`, updateError);
      } else {
        updatedCount++;
        console.log(`Updated thumbnail for asset ${asset.id}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Updated ${updatedCount} out of ${assets.length} assets`,
        updated: updatedCount,
        total: assets.length
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
