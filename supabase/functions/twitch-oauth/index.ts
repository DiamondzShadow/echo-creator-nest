import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Invalid token');
    }

    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const action = url.searchParams.get('action');

    // Handle disconnect
    if (action === 'disconnect') {
      const { error: deleteError } = await supabaseClient
        .from('twitch_connections')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      return new Response(
        JSON.stringify({ success: true, message: 'Twitch account disconnected' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle OAuth callback
    if (!code) {
      throw new Error('No authorization code provided');
    }

    const clientId = Deno.env.get('TWITCH_CLIENT_ID');
    const clientSecret = Deno.env.get('TWITCH_CLIENT_SECRET');
    const redirectUri = 'https://crabbytv.com/auth/twitch/callback';

    console.log('Exchanging code for token...');

    // Exchange code for access token
    const tokenResponse = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      throw new Error('Failed to exchange code for token');
    }

    const tokenData = await tokenResponse.json();
    console.log('Token obtained successfully');

    // Get user info from Twitch
    const userResponse = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Client-Id': clientId!,
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to get Twitch user info');
    }

    const userData = await userResponse.json();
    const twitchUser = userData.data[0];

    console.log('Twitch user:', twitchUser.login);

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    // Upsert Twitch connection
    const { error: upsertError } = await supabaseClient
      .from('twitch_connections')
      .upsert({
        user_id: user.id,
        twitch_user_id: twitchUser.id,
        twitch_username: twitchUser.login,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (upsertError) {
      console.error('Database error:', upsertError);
      throw upsertError;
    }

    console.log('Connection saved successfully');

    return new Response(
      JSON.stringify({
        success: true,
        twitch_username: twitchUser.login,
        twitch_user_id: twitchUser.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in twitch-oauth function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
