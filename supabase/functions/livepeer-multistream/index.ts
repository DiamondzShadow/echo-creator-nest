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
    console.log('🔵 Multistream function called');

    const LIVEPEER_API_KEY = Deno.env.get('LIVEPEER_API_KEY');
    if (!LIVEPEER_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'LIVEPEER_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, streamId, target } = await req.json();
    console.log('📥 Request:', { action, streamId, target });

    if (action === 'add' && streamId && target) {
      // Add multistream target
      const response = await fetch(`https://livepeer.studio/api/stream/${streamId}/multistream/target`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LIVEPEER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profile: target.profile || 'source',
          spec: {
            name: target.name,
            url: target.url, // RTMP/RTMPS/SRT URL
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Add target error:', response.status, errorText);
        return new Response(
          JSON.stringify({ error: `Failed to add target: ${errorText}` }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const result = await response.json();
      console.log('✅ Target added:', result);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'remove' && streamId && target?.id) {
      // Remove multistream target
      const response = await fetch(`https://livepeer.studio/api/stream/${streamId}/multistream/target/${target.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${LIVEPEER_API_KEY}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Remove target error:', response.status, errorText);
      }

      console.log('✅ Target removed');
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'list' && streamId) {
      // List multistream targets
      const response = await fetch(`https://livepeer.studio/api/stream/${streamId}`, {
        headers: {
          'Authorization': `Bearer ${LIVEPEER_API_KEY}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ List error:', response.status, errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to get stream' }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const stream = await response.json();
      console.log('✅ Targets retrieved');
      return new Response(
        JSON.stringify({ targets: stream.multistream?.targets || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Multistream error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
