import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TranscodeProfile {
  name: string;
  bitrate: number;
  fps: number;
  width: number;
  height: number;
}

interface TranscodeRequest {
  action: 'create' | 'status' | 'list';
  taskId?: string;
  inputPath?: string;
  outputHlsPath?: string;
  outputMp4Path?: string;
  profiles?: TranscodeProfile[];
}

interface TranscodeTaskResponse {
  id: string;
  status: {
    phase: 'pending' | 'running' | 'completed' | 'failed';
    progress?: number;
    errorMessage?: string;
  };
  input?: {
    url: string;
  };
  output?: {
    hls?: {
      path: string;
    };
    mp4?: {
      path: string;
    };
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LIVEPEER_API_KEY = Deno.env.get('LIVEPEER_API_KEY');
    const STORJ_ACCESS_KEY_ID = Deno.env.get('STORJ_ACCESS_KEY_ID');
    const STORJ_SECRET_ACCESS_KEY = Deno.env.get('STORJ_SECRET_ACCESS_KEY');
    const STORJ_BUCKET = Deno.env.get('STORJ_BUCKET') || 'livepeer-videos';
    const STORJ_ENDPOINT = Deno.env.get('STORJ_ENDPOINT') || 'https://gateway.storjshare.io';

    if (!LIVEPEER_API_KEY) {
      throw new Error('LIVEPEER_API_KEY is not configured');
    }

    if (!STORJ_ACCESS_KEY_ID || !STORJ_SECRET_ACCESS_KEY) {
      throw new Error('Storj S3 credentials are not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      action, 
      taskId, 
      inputPath, 
      outputHlsPath, 
      outputMp4Path,
      profiles 
    }: TranscodeRequest = await req.json();

    if (action === 'create') {
      if (!inputPath) {
        throw new Error('inputPath is required for create action');
      }

      // Default profiles if none provided
      const transcodeProfiles: TranscodeProfile[] = profiles || [
        {
          name: '1080p',
          bitrate: 6000000,
          fps: 30,
          width: 1920,
          height: 1080
        },
        {
          name: '720p',
          bitrate: 3000000,
          fps: 30,
          width: 1280,
          height: 720
        },
        {
          name: '480p',
          bitrate: 1000000,
          fps: 30,
          width: 854,
          height: 480
        },
        {
          name: '360p',
          bitrate: 500000,
          fps: 30,
          width: 640,
          height: 360
        }
      ];

      // Build outputs object
      const outputs: any = {};
      
      if (outputHlsPath) {
        outputs.hls = { path: outputHlsPath };
      }
      
      if (outputMp4Path) {
        outputs.mp4 = { path: outputMp4Path };
      }

      // If no outputs specified, use default paths
      if (Object.keys(outputs).length === 0) {
        const timestamp = Date.now();
        outputs.hls = { path: `/transcoded/${timestamp}/hls` };
        outputs.mp4 = { path: `/transcoded/${timestamp}/mp4` };
      }

      // Create transcode task using Livepeer API
      const transcodePayload = {
        input: {
          type: 's3',
          endpoint: STORJ_ENDPOINT,
          credentials: {
            accessKeyId: STORJ_ACCESS_KEY_ID,
            secretAccessKey: STORJ_SECRET_ACCESS_KEY
          },
          bucket: STORJ_BUCKET,
          path: inputPath
        },
        storage: {
          type: 's3',
          endpoint: STORJ_ENDPOINT,
          credentials: {
            accessKeyId: STORJ_ACCESS_KEY_ID,
            secretAccessKey: STORJ_SECRET_ACCESS_KEY
          },
          bucket: STORJ_BUCKET
        },
        outputs,
        profiles: transcodeProfiles
      };

      console.log('Creating transcode task with payload:', JSON.stringify(transcodePayload, null, 2));

      const response = await fetch('https://livepeer.studio/api/transcode', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LIVEPEER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transcodePayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Livepeer API error:', errorText);
        throw new Error(`Failed to create transcode task: ${errorText}`);
      }

      const task = await response.json();
      console.log('Created transcode task:', task);

      return new Response(
        JSON.stringify({
          taskId: task.id,
          status: task.status,
          input: task.input,
          output: task.output || outputs,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } 
    else if (action === 'status' && taskId) {
      // Get transcode task status
      const response = await fetch(`https://livepeer.studio/api/transcode/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${LIVEPEER_API_KEY}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get task status: ${errorText}`);
      }

      const task: TranscodeTaskResponse = await response.json();
      
      return new Response(
        JSON.stringify(task),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    else if (action === 'list') {
      // List all transcode tasks
      const response = await fetch('https://livepeer.studio/api/transcode', {
        headers: {
          'Authorization': `Bearer ${LIVEPEER_API_KEY}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to list tasks: ${errorText}`);
      }

      const tasks = await response.json();
      
      return new Response(
        JSON.stringify(tasks),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use "create", "status", or "list"' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Transcode error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
