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
    const { title, description, category, template } = await req.json();
    
    if (!title) {
      return new Response(
        JSON.stringify({ error: 'Title is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Template-specific prompt configurations
    const templates: Record<string, string> = {
      gaming: `Create a high-energy gaming thumbnail for "${title}". 
        Style: Bold neon colors (electric blue, toxic green, hot pink), dramatic lighting, action-packed composition
        Text: Large bold title text with glowing effect and sharp edges
        Elements: Gaming aesthetic with dramatic shadows, intense energy, explosive effects
        Mood: Exciting, competitive, attention-grabbing`,
      
      vlog: `Create a warm, personal vlog thumbnail for "${title}".
        Style: Bright natural lighting, warm color palette (coral, yellow, sky blue), friendly and inviting
        Text: Clean, modern sans-serif title text with subtle shadow
        Elements: Natural, candid aesthetic with soft bokeh background, authentic feel
        Mood: Friendly, approachable, conversational`,
      
      tutorial: `Create a professional tutorial/educational thumbnail for "${title}".
        Style: Clean, organized layout with bold accent colors, high contrast
        Text: Clear, readable title text with numbered steps or arrows if relevant
        Elements: Professional look with icons, diagrams, or step indicators
        Mood: Informative, trustworthy, easy to understand`,
      
      podcast: `Create an engaging podcast thumbnail for "${title}".
        Style: Sophisticated color scheme (deep purple, gold accents, dark background), audio wave elements
        Text: Bold serif or modern title text with elegant styling
        Elements: Microphone imagery, sound waves, professional studio aesthetic
        Mood: Intimate, thoughtful, professional`,
      
      music: `Create a vibrant music thumbnail for "${title}".
        Style: Colorful gradient backgrounds, dynamic flow, artistic composition
        Text: Stylized title text that flows with the music theme
        Elements: Musical elements like notes, waveforms, or artistic abstractions
        Mood: Creative, energetic, artistic`,
      
      tech: `Create a sleek tech/review thumbnail for "${title}".
        Style: Modern minimalist design, tech colors (electric blue, silver, black), futuristic feel
        Text: Clean geometric title text with tech-style accents
        Elements: Digital/circuit board patterns, product focus, professional lighting
        Mood: Innovative, cutting-edge, professional`,
      
      default: `Create an eye-catching thumbnail for "${title}".
        Style: Bold, dynamic composition with vibrant colors and high contrast
        Text: Large, readable title text with strong visual impact
        Elements: Professional and attention-grabbing design
        Mood: Engaging and visually appealing`
    };

    const selectedTemplate = template && templates[template] ? template : 'default';
    const templatePrompt = templates[selectedTemplate];

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Generating AI thumbnail for:', title, 'with template:', selectedTemplate);

    // Create template-based prompt
    const prompt = `${templatePrompt}

Video title: "${title}"
${description ? `Description: ${description}` : ''}
${category ? `Category: ${category}` : ''}

Technical requirements:
- 16:9 aspect ratio optimized for video thumbnails
- High contrast for readability at small sizes
- Professional quality composition
- Title text must be integrated into the design`;


    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI thumbnail generation response received');

    // Extract the base64 image from the response
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageUrl) {
      throw new Error('No image generated in response');
    }

    return new Response(
      JSON.stringify({ imageUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-ai-thumbnail:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
