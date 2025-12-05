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

    const { image, readings } = body;

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

    console.log(`[${requestId}] Analyzing glucose meter image`);

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.error(`[${requestId}] OpenAI API key not configured`);
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Prepare context from recent readings if available
    let contextText = '';
    if (readings && readings.length > 0) {
      const recentReadings = readings.slice(0, 5);
      const avgGlucose = Math.round(
        recentReadings.reduce((sum: number, r: any) => sum + r.value, 0) / recentReadings.length
      );
      contextText = `\n\nRecent glucose history context:\n- Average of last ${recentReadings.length} readings: ${avgGlucose} mg/dL\n- Recent readings: ${recentReadings.map((r: any) => `${r.value} mg/dL`).join(', ')}`;
    }

    console.log(`[${requestId}] Calling OpenAI Vision API`);

    // Call OpenAI Vision API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a diabetes management AI assistant. Analyze glucose meter images and provide helpful insights. Extract the glucose reading value, assess if it\'s in a healthy range (70-180 mg/dL), identify patterns if context is provided, and give actionable recommendations. Be supportive and encouraging.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Please analyze this glucose meter image and provide:\n1. The glucose reading value (in mg/dL)\n2. Assessment (Low <70, Normal 70-180, High >180)\n3. Brief interpretation and what it means\n4. Actionable recommendations\n5. Any patterns or trends based on recent history${contextText}\n\nKeep the response concise, supportive, and under 250 words.`,
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
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error(`[${requestId}] OpenAI API error:`, errorText);
      
      // Try to parse error for better message
      try {
        const errorJson = JSON.parse(errorText);
        return new Response(
          JSON.stringify({ error: errorJson }),
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
          JSON.stringify({ error: 'Failed to analyze glucose meter image' }),
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
    const analysis = openaiData.choices[0].message.content;

    console.log(`[${requestId}] AI Analysis:`, analysis);
    console.log(`[${requestId}] Successfully analyzed glucose meter image`);

    return new Response(
      JSON.stringify({ analysis }),
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
      JSON.stringify({ error: 'Internal server error' }),
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