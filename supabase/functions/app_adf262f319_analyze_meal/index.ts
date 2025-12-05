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

    console.log(`[${requestId}] Analyzing meal image for user:`, userId);

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
            content: 'You are a nutritionist AI assistant. Analyze food images and provide accurate nutritional estimates. Return your response as a JSON object with the following fields: name (string, the meal name), carbs (number, grams of carbohydrates), protein (number, grams of protein), fat (number, grams of fat), calories (number, total calories), description (string, brief description of the meal and its components). Be as accurate as possible with portion sizes.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please analyze this meal image and provide nutritional information including the meal name, carbohydrates (g), protein (g), fat (g), and total calories. Format your response as JSON.',
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
      return new Response(
        JSON.stringify({ error: 'Failed to analyze meal image' }),
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
    let nutritionData;
    try {
      // Try to extract JSON from the response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        nutritionData = JSON.parse(jsonMatch[0]);
      } else {
        // If no JSON found, try parsing the whole response
        nutritionData = JSON.parse(aiResponse);
      }
    } catch (parseError) {
      console.error(`[${requestId}] Failed to parse AI response as JSON:`, parseError);
      // Fallback: return a generic response
      nutritionData = {
        name: 'Meal',
        carbs: 0,
        protein: 0,
        fat: 0,
        calories: 0,
        description: 'Unable to analyze meal accurately. Please enter details manually.',
      };
    }

    console.log(`[${requestId}] Successfully analyzed meal:`, nutritionData);

    return new Response(
      JSON.stringify(nutritionData),
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