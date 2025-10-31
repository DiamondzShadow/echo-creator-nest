import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, record = false } = await req.json();

    if (!name) {
      return new Response(
        JSON.stringify({ error: 'Stream name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const livepeerApiKey = Deno.env.get('LIVEPEER_API_KEY');
    if (!livepeerApiKey) {
      console.error('LIVEPEER_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Livepeer not configured. Please contact admin.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Creating Livepeer stream:', { name, record });

    // Create Livepeer stream
    const response = await fetch('https://livepeer.studio/api/stream', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${livepeerApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        profiles: [
          {
            name: '720p',
            bitrate: 3000000,
            fps: 30,
            width: 1280,
            height: 720,
          },
          {
            name: '480p',
            bitrate: 1600000,
            fps: 30,
            width: 854,
            height: 480,
          },
          {
            name: '360p',
            bitrate: 800000,
            fps: 30,
            width: 640,
            height: 360,
          },
        ],
        record,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Livepeer API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create Livepeer stream',
          details: errorText 
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stream = await response.json();
    console.log('Livepeer stream created successfully:', stream.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        stream: {
          id: stream.id,
          name: stream.name,
          streamKey: stream.streamKey,
          playbackId: stream.playbackId,
          isActive: stream.isActive,
          createdAt: stream.createdAt,
        }
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error creating Livepeer stream:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: errorDetails
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
