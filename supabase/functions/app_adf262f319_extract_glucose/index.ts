Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Request received:`, {
    method: req.method,
    headers: Object.fromEntries(req.headers.entries()),
  });

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    });
  }

  try {
    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error(`[${requestId}] Failed to parse request body:`, e);
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const { image } = body;

    if (!image) {
      console.error(`[${requestId}] No image provided`);
      return new Response(
        JSON.stringify({ error: 'Image is required' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    console.log(`[${requestId}] Extracting glucose readings from image`);

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.error(`[${requestId}] OpenAI API key not configured`);
      return new Response(
        JSON.stringify({ 
          error: {
            message: "OpenAI API key is not configured in Supabase edge function secrets. Please add OPENAI_API_KEY to your edge function secrets."
          }
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    console.log(`[${requestId}] Calling OpenAI Vision API`);

    const today = new Date().toISOString().split('T')[0];

    // Call OpenAI Vision API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are analyzing a glucose monitoring image. Your task is to extract ALL glucose readings visible in the image.

IMAGE TYPES YOU MAY ENCOUNTER:
1. Glucose meter display - Shows a single reading with a number
2. Mobile app screenshot - Lists multiple readings with timestamps
3. LINE GRAPH/CHART - Shows glucose values plotted over time with:
   - X-axis: Time (hours like 08, 12, 16, 20, or "Acum")
   - Y-axis: Glucose values (mg/dL, typically 70-250 range)
   - A curve/line connecting data points
4. Table/spreadsheet - Rows of glucose measurements

CRITICAL INSTRUCTIONS FOR CHARTS/GRAPHS:
- Look at the Y-axis (vertical) for glucose values (typically 70, 100, 150, 200, 250 mg/dL)
- Look at the X-axis (horizontal) for time labels (08, 12, 16, 20, etc.)
- Follow the black dotted line or curve from left to right
- For EACH visible point on the curve, estimate:
  * The time by looking at its X position (between time markers)
  * The glucose value by looking at its Y position (between value markers)
- Extract at least 10-20 readings from a typical daily chart
- Space readings evenly (every 30-60 minutes)

EXAMPLE CHART ANALYSIS:
If you see a chart with time 08-20 and glucose range 70-250:
- Point at X=08:00, Y=120 → {"date":"${today}","time":"08:00","value":120}
- Point at X=09:30, Y=140 → {"date":"${today}","time":"09:30","value":140}
- Point at X=11:00, Y=110 → {"date":"${today}","time":"11:00","value":110}
- Continue for ALL visible points on the curve

OUTPUT FORMAT:
Return ONLY a JSON array with this exact structure (no markdown, no explanations):
[{"date":"YYYY-MM-DD","time":"HH:MM","value":number}]

For charts, extract 10-30 readings depending on the time span.
For single meters, extract 1 reading.
For app screenshots with lists, extract all visible readings.

If you see a chart but cannot read specific values, make reasonable estimates based on:
- The curve's position relative to Y-axis markers
- The time position relative to X-axis markers
- Typical glucose patterns (fasting: 70-100, post-meal: 140-180, peaks: 200-250)

IMPORTANT: Do not return an empty array unless the image contains NO glucose-related data at all.`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 4000,
        temperature: 0.2,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error(`[${requestId}] OpenAI API error:`, errorText);
      
      try {
        const errorJson = JSON.parse(errorText);
        return new Response(
          JSON.stringify({ error: errorJson.error || errorJson }),
          {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      } catch {
        return new Response(
          JSON.stringify({ error: { message: 'Failed to extract glucose readings from image' } }),
          {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }
    }

    const openaiData = await openaiResponse.json();
    let content = openaiData.choices[0].message.content;

    console.log(`[${requestId}] OpenAI raw response:`, content);

    // Clean up the response - remove markdown code blocks if present
    content = content.trim();
    
    // Remove markdown code blocks (```json ... ``` or ``` ... ```)
    if (content.startsWith('```')) {
      content = content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/, '');
    }
    
    // Remove any leading/trailing whitespace again
    content = content.trim();

    console.log(`[${requestId}] Cleaned response:`, content);

    // Parse the JSON response
    let readings;
    try {
      readings = JSON.parse(content);
      
      // Validate it's an array
      if (!Array.isArray(readings)) {
        throw new Error('Response is not an array');
      }
      
      // Validate each reading has required fields
      for (const reading of readings) {
        if (!reading.date || !reading.time || typeof reading.value !== 'number') {
          throw new Error('Invalid reading format');
        }
      }
      
    } catch (parseError) {
      console.error(`[${requestId}] Failed to parse OpenAI response:`, {
        error: parseError,
        content: content,
      });
      
      return new Response(
        JSON.stringify({ 
          error: { 
            message: 'Failed to extract glucose readings. The AI could not identify clear glucose data in the image. Please ensure the image shows: 1) A glucose meter display with a number, 2) A chart with time and glucose axes, or 3) A list of glucose readings.',
            details: content.substring(0, 300)
          } 
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    console.log(`[${requestId}] Successfully extracted ${readings.length} glucose readings`);

    return new Response(
      JSON.stringify({ readings }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error(`[${requestId}] Unexpected error:`, error);
    return new Response(
      JSON.stringify({ error: { message: 'Internal server error', details: error.message } }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});