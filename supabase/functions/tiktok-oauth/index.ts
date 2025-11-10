import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts';

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
    const tiktokClientId = Deno.env.get('TIKTOK_CLIENT_ID');
    const tiktokClientSecret = Deno.env.get('TIKTOK_CLIENT_SECRET');

    if (!tiktokClientId || !tiktokClientSecret) {
      throw new Error('TikTok API credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    
    // Get action from query params (for callbacks) or request body (for API calls)
    let action = url.searchParams.get('action');
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    
    // If no action in query params, try to get it from request body
    if (!action && req.method === 'POST') {
      try {
        const body = await req.json();
        action = body.action;
      } catch (e) {
        // If JSON parsing fails, continue without action
      }
    }

    console.log('TikTok OAuth action:', action || (code ? 'callback' : 'unknown'));

    // Handle OAuth callback
    if (code && state) {
      console.log('Processing OAuth callback with code and state');

      // Validate state parameter
      const [userId, stateToken] = state.split('.');
      if (!userId || !stateToken) {
        throw new Error('Invalid state parameter');
      }

      // Exchange code for access token
      const tokenResponse = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cache-Control': 'no-cache',
        },
        body: new URLSearchParams({
          client_key: tiktokClientId,
          client_secret: tiktokClientSecret,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: `${supabaseUrl}/functions/v1/tiktok-oauth`,
        }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        console.error('TikTok token error:', error);
        throw new Error('Failed to exchange code for token');
      }

      const tokenData = await tokenResponse.json();
      console.log('Got access token:', tokenData.access_token ? 'present' : 'missing');

      // Fetch TikTok user info
      const userResponse = await fetch('https://open.tiktokapis.com/v2/user/info/', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!userResponse.ok) {
        const error = await userResponse.text();
        console.error('TikTok user info error:', error);
        throw new Error('Failed to fetch user info');
      }

      const userData = await userResponse.json();
      console.log('Got user info:', userData.data?.user?.display_name);

      // Store connection in database
      const { error: dbError } = await supabase
        .from('platform_connections')
        .upsert({
          user_id: userId,
          platform: 'tiktok',
          platform_user_id: userData.data.user.open_id,
          platform_username: userData.data.user.display_name,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
          metadata: {
            profile_url: userData.data.user.avatar_url || null,
            scope: tokenData.scope,
          },
        }, {
          onConflict: 'user_id,platform',
        });

      if (dbError) {
        console.error('Database error:', dbError);
        throw dbError;
      }

      console.log('TikTok connection saved successfully');

      // Redirect back to app
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': `${url.origin}/live?tiktok=connected`,
        },
      });
    }

    // Handle authorization request
    if (action === 'authorize') {
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

      // Generate state parameter with user ID and random token
      const randomToken = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      const state = `${user.id}.${randomToken}`;

      // Build TikTok OAuth URL
      const authUrl = new URL('https://www.tiktok.com/v2/auth/authorize/');
      authUrl.searchParams.set('client_key', tiktokClientId);
      authUrl.searchParams.set('scope', 'user.info.basic,video.list');
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('redirect_uri', `${supabaseUrl}/functions/v1/tiktok-oauth`);
      authUrl.searchParams.set('state', state);

      console.log('Generated auth URL for user:', user.id);

      return new Response(
        JSON.stringify({ authUrl: authUrl.toString() }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle disconnect request
    if (action === 'disconnect') {
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

      const { error: deleteError } = await supabase
        .from('platform_connections')
        .delete()
        .eq('user_id', user.id)
        .eq('platform', 'tiktok');

      if (deleteError) throw deleteError;

      console.log('TikTok disconnected for user:', user.id);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');
  } catch (error) {
    console.error('TikTok OAuth error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
