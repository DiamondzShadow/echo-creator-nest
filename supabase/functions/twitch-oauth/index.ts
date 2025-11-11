import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to create EventSub subscription
async function createEventSubSubscription(
  type: string,
  broadcasterUserId: string,
  clientId: string,
  accessToken: string,
  webhookSecret: string
): Promise<{ subscription_id: string; status: string }> {
  const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/twitch-webhook`;
  
  const response = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Client-Id': clientId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type,
      version: '1',
      condition: {
        broadcaster_user_id: broadcasterUserId,
      },
      transport: {
        method: 'webhook',
        callback: webhookUrl,
        secret: webhookSecret,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Failed to create ${type} subscription:`, errorText);
    throw new Error(`Failed to create ${type} subscription: ${errorText}`);
  }

  const data = await response.json();
  return {
    subscription_id: data.data[0].id,
    status: data.data[0].status,
  };
}

// Helper function to delete EventSub subscription
async function deleteEventSubSubscription(
  subscriptionId: string,
  clientId: string,
  accessToken: string
): Promise<void> {
  const response = await fetch(
    `https://api.twitch.tv/helix/eventsub/subscriptions?id=${subscriptionId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Client-Id': clientId,
      },
    }
  );

  if (!response.ok && response.status !== 404) {
    const errorText = await response.text();
    console.error(`Failed to delete subscription ${subscriptionId}:`, errorText);
    // Don't throw error, just log it - subscription might already be deleted
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
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
    const clientId = Deno.env.get('TWITCH_CLIENT_ID');

    // Handle disconnect
    if (action === 'disconnect') {
      // Get existing connection to retrieve access token and subscriptions
      const { data: connection } = await supabaseClient
        .from('twitch_connections')
        .select('access_token')
        .eq('user_id', user.id)
        .single();

      // Get and delete all EventSub subscriptions
      if (connection?.access_token) {
        const { data: subscriptions } = await supabaseClient
          .from('twitch_eventsub_subscriptions')
          .select('subscription_id')
          .eq('user_id', user.id);

        if (subscriptions) {
          for (const sub of subscriptions) {
            try {
              await deleteEventSubSubscription(
                sub.subscription_id,
                clientId!,
                connection.access_token
              );
            } catch (error) {
              console.error('Error deleting subscription:', error);
              // Continue even if deletion fails
            }
          }
        }

        // Delete subscription records
        await supabaseClient
          .from('twitch_eventsub_subscriptions')
          .delete()
          .eq('user_id', user.id);
      }

      // Delete connection
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

    const clientSecret = Deno.env.get('TWITCH_CLIENT_SECRET');
    
    // Determine redirect URI - prefer production URL for stability
    // The redirect URI MUST match what was sent in the authorization request
    const redirectUri = 'https://crabbytv.com/auth/twitch/callback';

    console.log('Exchanging code for token...');
    console.log('Using redirect URI:', redirectUri);
    console.log('Client ID:', clientId);

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

    console.log('Token response status:', tokenResponse.status);
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: errorText,
        redirectUri: redirectUri
      });
      throw new Error(`Failed to exchange code for token: ${errorText}`);
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

    // Create EventSub subscriptions for stream events
    console.log('Creating EventSub subscriptions...');
    const subscriptionTypes = ['stream.online', 'stream.offline'];
    
    for (const subType of subscriptionTypes) {
      try {
        const { subscription_id, status } = await createEventSubSubscription(
          subType,
          twitchUser.id,
          clientId!,
          tokenData.access_token,
          clientSecret!
        );

        // Save subscription to database
        await supabaseClient
          .from('twitch_eventsub_subscriptions')
          .upsert({
            user_id: user.id,
            twitch_user_id: twitchUser.id,
            subscription_id: subscription_id,
            subscription_type: subType,
            status: status,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'twitch_user_id,subscription_type',
          });

        console.log(`Created ${subType} subscription: ${subscription_id}`);
      } catch (error) {
        console.error(`Error creating ${subType} subscription:`, error);
        // Continue even if subscription fails - connection is still valid
      }
    }

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
