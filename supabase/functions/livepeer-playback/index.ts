import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LIVEPEER_API_KEY = Deno.env.get('LIVEPEER_API_KEY');
    if (!LIVEPEER_API_KEY) {
      throw new Error('LIVEPEER_API_KEY is not configured');
    }

    const { playbackId } = await req.json();

    if (!playbackId) {
      return new Response(
        JSON.stringify({ error: 'playbackId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get playback info from Livepeer
    const response = await fetch(`https://livepeer.studio/api/playback/${playbackId}`, {
      headers: {
        'Authorization': `Bearer ${LIVEPEER_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch playback info: ${response.statusText}`);
    }

    const playbackInfo = await response.json();
    
    return new Response(
      JSON.stringify(playbackInfo),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Playback info error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
