import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Edge function to end a live stream
 * Designed to be called via navigator.sendBeacon() for reliable cleanup on tab close
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { streamId, endAll } = await req.json();

    console.log('End stream request:', { streamId, endAll, userId: user.id });

    if (endAll) {
      // End all live streams for this user
      const { data: endedStreams, error } = await supabase
        .from('live_streams')
        .update({
          is_live: false,
          ended_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('is_live', true)
        .select();

      if (error) {
        console.error('Error ending streams:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`✅ Ended ${endedStreams?.length || 0} streams for user ${user.id}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          endedCount: endedStreams?.length || 0,
          streams: endedStreams,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!streamId) {
      return new Response(
        JSON.stringify({ error: 'streamId required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user owns this stream
    const { data: stream, error: streamError } = await supabase
      .from('live_streams')
      .select('user_id')
      .eq('id', streamId)
      .single();

    if (streamError || !stream) {
      return new Response(
        JSON.stringify({ error: 'Stream not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (stream.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // End the stream
    const { error: updateError } = await supabase
      .from('live_streams')
      .update({
        is_live: false,
        ended_at: new Date().toISOString(),
      })
      .eq('id', streamId);

    if (updateError) {
      console.error('Error ending stream:', updateError);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Stream ended: ${streamId}`);

    return new Response(
      JSON.stringify({ success: true, streamId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('End stream error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
