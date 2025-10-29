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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all assets stuck in waiting/processing
    const { data: assets, error: fetchError } = await supabase
      .from('assets')
      .select('id, livepeer_asset_id, title')
      .in('status', ['waiting', 'processing']);

    if (fetchError) throw fetchError;

    let updated = 0;
    const results = [];

    for (const asset of assets || []) {
      try {
        // Check status from Livepeer
        const response = await fetch(
          `https://livepeer.studio/api/asset/${asset.livepeer_asset_id}`,
          {
            headers: {
              'Authorization': `Bearer ${livepeerApiKey}`,
            },
          }
        );

        if (!response.ok) continue;

        const livepeerAsset = await response.json();
        
        // Update database with current status
        const updateData: any = {
          status: livepeerAsset.status?.phase || 'waiting',
        };

        if (livepeerAsset.playbackId) {
          updateData.livepeer_playback_id = livepeerAsset.playbackId;
          updateData.thumbnail_url = `https://livepeer.studio/api/playback/${livepeerAsset.playbackId}/thumbnail.jpg`;
        }

        if (livepeerAsset.videoSpec?.duration) {
          updateData.duration = livepeerAsset.videoSpec.duration;
        }

        if (livepeerAsset.size) {
          updateData.size = livepeerAsset.size;
        }

        const { error: updateError } = await supabase
          .from('assets')
          .update(updateData)
          .eq('id', asset.id);

        if (!updateError) {
          updated++;
          results.push({ 
            title: asset.title, 
            status: updateData.status,
            success: true 
          });
        }
      } catch (err) {
        console.error(`Error updating ${asset.title}:`, err);
        results.push({ 
          title: asset.title, 
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Updated ${updated} assets`,
        total: assets?.length || 0,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
