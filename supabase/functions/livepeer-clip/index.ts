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
    console.log('🔵 Clip function called');

    const LIVEPEER_API_KEY = Deno.env.get('LIVEPEER_API_KEY');
    if (!LIVEPEER_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'LIVEPEER_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { playbackId, startTime, endTime, name } = await req.json();
    console.log('📥 Clip request:', { playbackId, startTime, endTime, name });

    if (!playbackId || !startTime || !endTime) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: playbackId, startTime, endTime' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate time range (max 120 seconds as per docs)
    const duration = endTime - startTime;
    if (duration > 120000) {
      return new Response(
        JSON.stringify({ error: 'Clip duration cannot exceed 120 seconds' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create clip via Livepeer API
    const response = await fetch('https://livepeer.studio/api/clip', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LIVEPEER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        playbackId,
        startTime,
        endTime,
        name: name || `Clip ${new Date().toISOString()}`,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Clip creation error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: `Failed to create clip: ${errorText}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();
    console.log('✅ Clip created:', { assetId: result.asset?.id, taskId: result.task?.id });

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Clip error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
