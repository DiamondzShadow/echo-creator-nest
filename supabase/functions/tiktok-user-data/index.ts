import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TikTokVideo {
  id: string;
  title: string;
  cover_image_url: string;
  share_url: string;
  video_description: string;
  duration: number;
  height: number;
  width: number;
  create_time: number;
  like_count: number;
  comment_count: number;
  share_count: number;
  view_count: number;
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
      console.log('Token expired, refreshing...');
      
      const tiktokClientKey = Deno.env.get('TIKTOK_CLIENT_KEY');
      const tiktokClientSecret = Deno.env.get('TIKTOK_CLIENT_SECRET');

      const refreshResponse = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_key: tiktokClientKey!,
          client_secret: tiktokClientSecret!,
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
    }

    // Fetch user stats
    const statsResponse = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=follower_count,following_count,likes_count,video_count', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!statsResponse.ok) {
      const error = await statsResponse.text();
      console.error('Stats error:', error);
      throw new Error('Failed to fetch user stats');
    }

    const statsData = await statsResponse.json();

    // Fetch user videos
    const videosResponse = await fetch('https://open.tiktokapis.com/v2/video/list/?fields=id,title,cover_image_url,share_url,video_description,duration,height,width,create_time,like_count,comment_count,share_count,view_count&max_count=20', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!videosResponse.ok) {
      const error = await videosResponse.text();
      console.error('Videos error:', error);
      throw new Error('Failed to fetch videos');
    }

    const videosData = await videosResponse.json();

    return new Response(
      JSON.stringify({
        stats: {
          follower_count: statsData.data?.user?.follower_count || 0,
          following_count: statsData.data?.user?.following_count || 0,
          likes_count: statsData.data?.user?.likes_count || 0,
          video_count: statsData.data?.user?.video_count || 0,
        },
        videos: videosData.data?.videos || [],
        has_more: videosData.data?.has_more || false,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('TikTok user data error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
