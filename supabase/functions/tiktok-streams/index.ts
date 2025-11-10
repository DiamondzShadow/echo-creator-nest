import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TikTokVideo {
  id: string;
  title: string;
  video_description: string;
  cover_image_url: string;
  create_time: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
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

    console.log('Fetching TikTok streams for user:', user.id);

    // Get TikTok connection
    const { data: connection, error: connError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'tiktok')
      .single();

    if (connError || !connection) {
      throw new Error('TikTok not connected');
    }

    // Check if token needs refresh
    const expiresAt = new Date(connection.expires_at);
    const now = new Date();
    let accessToken = connection.access_token;

    if (expiresAt <= now) {
      console.log('Access token expired, refreshing...');

      const tiktokClientId = Deno.env.get('TIKTOK_CLIENT_ID');
      const tiktokClientSecret = Deno.env.get('TIKTOK_CLIENT_SECRET');

      if (!tiktokClientId || !tiktokClientSecret) {
        throw new Error('TikTok credentials not configured');
      }

      const refreshResponse = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_key: tiktokClientId,
          client_secret: tiktokClientSecret,
          grant_type: 'refresh_token',
          refresh_token: connection.refresh_token,
        }),
      });

      if (!refreshResponse.ok) {
        throw new Error('Failed to refresh token');
      }

      const refreshData = await refreshResponse.json();
      accessToken = refreshData.access_token;

      // Update stored token
      await supabase
        .from('platform_connections')
        .update({
          access_token: refreshData.access_token,
          refresh_token: refreshData.refresh_token,
          expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
        })
        .eq('user_id', user.id)
        .eq('platform', 'tiktok');

      console.log('Token refreshed successfully');
    }

    // Fetch user's videos (TikTok doesn't have a dedicated live stream API like YouTube)
    // We'll fetch recent videos and check if any are live
    const videosResponse = await fetch('https://open.tiktokapis.com/v2/video/list/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        max_count: 20,
      }),
    });

    if (!videosResponse.ok) {
      const error = await videosResponse.text();
      console.error('TikTok API error:', error);
      throw new Error('Failed to fetch videos from TikTok');
    }

    const videosData = await videosResponse.json();
    console.log('Fetched videos:', videosData.data?.videos?.length || 0);

    // Note: TikTok's public API doesn't directly expose live stream info
    // For actual live stream pulling, you'd need TikTok Live Access which requires approval
    // This implementation provides a foundation that can be extended once approved

    const streams = (videosData.data?.videos || []).map((video: TikTokVideo) => ({
      id: video.id,
      title: video.title || 'Untitled',
      description: video.video_description || '',
      thumbnail: video.cover_image_url || '',
      status: 'recorded', // TikTok API doesn't expose live status in standard API
      watchUrl: `https://www.tiktok.com/@${connection.platform_username}/video/${video.id}`,
      liveUrl: null, // Would be available with TikTok Live Access
      rtmpUrl: null, // Would be available with TikTok Live Access
    }));

    return new Response(
      JSON.stringify({
        streams,
        note: 'TikTok Live Access requires approval. Contact TikTok to enable live stream API access.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('TikTok streams error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
