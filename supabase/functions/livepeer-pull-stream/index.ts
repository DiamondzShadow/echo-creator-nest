import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const livepeerApiKey = Deno.env.get('LIVEPEER_API_KEY')!;

    if (!livepeerApiKey) {
      throw new Error('LIVEPEER_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { action, pullUrl, streamId, title, description } = await req.json();

    console.log('Pull stream request:', { action, pullUrl, streamId });

    if (action === 'create') {
      // Create Livepeer stream with pull configuration
      const streamPayload = {
        name: title || 'Pull Stream',
        pull: {
          source: pullUrl,
          headers: {}, // Can add auth headers if needed
        },
        profiles: [
          {
            name: '720p',
            bitrate: 2000000,
            fps: 30,
            width: 1280,
            height: 720,
          },
          {
            name: '480p',
            bitrate: 1000000,
            fps: 30,
            width: 854,
            height: 480,
          },
          {
            name: '360p',
            bitrate: 500000,
            fps: 30,
            width: 640,
            height: 360,
          },
        ],
      };

      console.log('Creating Livepeer pull stream...');

      const livepeerResponse = await fetch('https://livepeer.studio/api/stream', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${livepeerApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(streamPayload),
      });

      if (!livepeerResponse.ok) {
        const error = await livepeerResponse.text();
        console.error('Livepeer error:', error);
        throw new Error(`Failed to create pull stream: ${error}`);
      }

      const streamData = await livepeerResponse.json();
      console.log('Livepeer stream created:', streamData.id);

      // Create database record
      const { data: dbStream, error: dbError } = await supabase
        .from('live_streams')
        .insert({
          user_id: user.id,
          title: title || 'Pull Stream',
          description: description || '',
          is_live: true,
          started_at: new Date().toISOString(),
          livepeer_stream_id: streamData.id,
          livepeer_playback_id: streamData.playbackId,
        })
        .select()
        .single();

      if (dbError) {
        console.error('Database error:', dbError);
        throw dbError;
      }

      console.log('Database record created:', dbStream.id);

      return new Response(
        JSON.stringify({
          success: true,
          streamId: dbStream.id,
          livepeerStreamId: streamData.id,
          playbackId: streamData.playbackId,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'delete' && streamId) {
      // Get stream from database
      const { data: stream } = await supabase
        .from('live_streams')
        .select('livepeer_stream_id')
        .eq('id', streamId)
        .eq('user_id', user.id)
        .single();

      if (stream?.livepeer_stream_id) {
        // Delete from Livepeer
        await fetch(`https://livepeer.studio/api/stream/${stream.livepeer_stream_id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${livepeerApiKey}`,
          },
        });
      }

      // Mark as ended in database
      await supabase
        .from('live_streams')
        .update({ is_live: false, ended_at: new Date().toISOString() })
        .eq('id', streamId)
        .eq('user_id', user.id);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');
  } catch (error) {
    console.error('Pull stream error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
