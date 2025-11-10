import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UploadVideoRequest {
  videoUrl: string;
  title: string;
  description?: string;
  privacy_level?: 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'SELF_ONLY';
  disable_duet?: boolean;
  disable_comment?: boolean;
  disable_stitch?: boolean;
  video_cover_timestamp_ms?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const tiktokClientKey = Deno.env.get('TIKTOK_CLIENT_KEY');
    const tiktokClientSecret = Deno.env.get('TIKTOK_CLIENT_SECRET');

    if (!tiktokClientKey || !tiktokClientSecret) {
      throw new Error('TikTok API credentials not configured');
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
    const expiresAt = new Date(connection.token_expires_at);
    const now = new Date();
    let accessToken = connection.access_token;

    if (expiresAt <= now) {
      console.log('Access token expired, refreshing...');

      const refreshResponse = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_key: tiktokClientKey,
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
          token_expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
        })
        .eq('user_id', user.id)
        .eq('platform', 'tiktok');
    }

    const body: UploadVideoRequest = await req.json();

    // Step 1: Initialize upload
    const initResponse = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        post_info: {
          title: body.title.substring(0, 150), // TikTok title max 150 chars
          description: body.description?.substring(0, 2200) || '', // Max 2200 chars
          privacy_level: body.privacy_level || 'PUBLIC_TO_EVERYONE',
          disable_duet: body.disable_duet || false,
          disable_comment: body.disable_comment || false,
          disable_stitch: body.disable_stitch || false,
          video_cover_timestamp_ms: body.video_cover_timestamp_ms || 1000,
        },
        source_info: {
          source: 'PULL_FROM_URL',
          video_url: body.videoUrl,
        },
      }),
    });

    if (!initResponse.ok) {
      const error = await initResponse.text();
      console.error('TikTok upload init error:', error);
      throw new Error(`Failed to initialize upload: ${error}`);
    }

    const initData = await initResponse.json();
    console.log('Upload initialized:', initData);

    return new Response(
      JSON.stringify({
        success: true,
        publish_id: initData.data?.publish_id,
        message: 'Video upload initiated to TikTok. You can check the status using the publish_id.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('TikTok upload error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
