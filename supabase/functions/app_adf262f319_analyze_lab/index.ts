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

    const { image, userId } = body;

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

    console.log(`[${requestId}] Analyzing lab report image for user:`, userId);

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
            content: `You are a medical lab report analyzer AI. Extract key information from lab report images and provide health recommendations.

Return your response as a JSON array of test results. Each result should be an object with:
- test_name (string): the name of the test
- value (string): the test result value with units
- date (string): the test date in YYYY-MM-DD format if available, otherwise use today's date
- status (string): "normal", "high", or "low" based on reference ranges
- notes (string): A brief, actionable health recommendation based on the result. Include:
  * If HIGH: "⚠️ This value is higher than normal. Consider consulting your doctor about [specific concern]."
  * If LOW: "⚠️ This value is lower than normal. Consider consulting your doctor about [specific concern]."
  * If NORMAL: "✓ This value is within normal range."
  * Always be specific about what the abnormal value might indicate (e.g., "high blood sugar may indicate poor diabetes control", "low vitamin D may affect bone health")

Focus on diabetes-related tests like HbA1c, fasting glucose, cholesterol, triglycerides, kidney function, etc.`,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please analyze this lab report image and extract all test results with health recommendations. Format your response as a JSON array of test objects.',
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
        max_tokens: 1500,
        temperature: 0.2,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error(`[${requestId}] OpenAI API error:`, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to analyze lab report image' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const openaiData = await openaiResponse.json();
    const aiResponse = openaiData.choices[0].message.content;

    console.log(`[${requestId}] AI Response:`, aiResponse);

    // Parse the JSON response from AI
    let labResults;
    try {
      // Try to extract JSON array from the response
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        labResults = JSON.parse(jsonMatch[0]);
      } else {
        // Try parsing the whole response
        labResults = JSON.parse(aiResponse);
      }

      // Ensure it's an array
      if (!Array.isArray(labResults)) {
        labResults = [labResults];
      }
    } catch (parseError) {
      console.error(`[${requestId}] Failed to parse AI response as JSON:`, parseError);
      // Fallback: return empty array
      labResults = [];
    }

    console.log(`[${requestId}] Successfully analyzed lab report:`, labResults);

    return new Response(
      JSON.stringify({ results: labResults }),
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