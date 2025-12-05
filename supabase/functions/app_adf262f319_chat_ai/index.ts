import { createClient } from 'npm:@supabase/supabase-js@2';

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

    const { messages, userId, healthData } = body;

    if (!messages || !Array.isArray(messages)) {
      console.error(`[${requestId}] Invalid messages format`);
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    console.log(`[${requestId}] Processing chat request for user:`, userId);

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

    // Build context from health data
    let contextData = '';
    
    if (healthData) {
      // Process glucose readings
      if (healthData.glucose && healthData.glucose.length > 0) {
        const glucoseValues = healthData.glucose.map(r => r.value);
        const avgGlucose = glucoseValues.reduce((sum, val) => sum + val, 0) / glucoseValues.length;
        const minGlucose = Math.min(...glucoseValues);
        const maxGlucose = Math.max(...glucoseValues);
        
        contextData += `\n\nRecent Glucose Readings (last 30 days, up to 50 readings):\n`;
        contextData += `- Average: ${avgGlucose.toFixed(1)} mg/dL\n`;
        contextData += `- Range: ${minGlucose} - ${maxGlucose} mg/dL\n`;
        contextData += `- Total readings: ${healthData.glucose.length}\n`;
        
        // Include individual readings with dates
        contextData += `- Recent readings:\n`;
        healthData.glucose.slice(0, 10).forEach(reading => {
          const date = new Date(reading.date).toLocaleDateString();
          contextData += `  * ${date}: ${reading.value} mg/dL${reading.notes ? ` (${reading.notes})` : ''}\n`;
        });
      }

      // Process meals
      if (healthData.meals && healthData.meals.length > 0) {
        const carbValues = healthData.meals.map(m => m.carbs);
        const avgCarbs = carbValues.reduce((sum, val) => sum + val, 0) / carbValues.length;
        const totalCarbs = carbValues.reduce((sum, val) => sum + val, 0);
        
        contextData += `\n\nRecent Meals (last 30 days, up to 30 meals):\n`;
        contextData += `- Average carbs per meal: ${avgCarbs.toFixed(1)}g\n`;
        contextData += `- Total carbs tracked: ${totalCarbs}g\n`;
        contextData += `- Total meals logged: ${healthData.meals.length}\n`;
        
        // Include individual meals with dates
        contextData += `- Recent meals:\n`;
        healthData.meals.slice(0, 10).forEach(meal => {
          const date = new Date(meal.date).toLocaleDateString();
          contextData += `  * ${date}: ${meal.name} - ${meal.carbs}g carbs\n`;
        });
      }

      // Process lab results
      if (healthData.labs && healthData.labs.length > 0) {
        contextData += `\n\nRecent Lab Results (up to 10 results):\n`;
        healthData.labs.forEach(lab => {
          const date = new Date(lab.date).toLocaleDateString();
          contextData += `- ${date}: ${lab.test_name} = ${lab.value}\n`;
        });
      }
    }

    // Prepare messages with system context
    const systemMessage = {
      role: 'system',
      content: `You are a helpful diabetes management assistant. You provide supportive, evidence-based guidance about diabetes care, blood sugar management, nutrition, and healthy lifestyle choices.

${contextData ? `The user has shared their health data with you. Here is their recent health information:${contextData}` : 'The user has not yet logged any health data.'}

When answering questions:
- Reference their actual data when relevant (e.g., "I see your glucose readings have been averaging X mg/dL...")
- Provide personalized insights based on their patterns
- Offer specific, actionable advice tailored to their situation
- Be empathetic, encouraging, and informative
- Always remind users to consult healthcare professionals for medical decisions
- If they ask about trends, analyze their actual data
- If they ask for meal suggestions, consider their carb intake patterns`,
    };

    const chatMessages = [systemMessage, ...messages];

    console.log(`[${requestId}] Calling OpenAI API with ${chatMessages.length} messages and health context`);

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: chatMessages,
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error(`[${requestId}] OpenAI API error:`, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to get AI response' }),
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
    const aiMessage = openaiData.choices[0].message.content;

    console.log(`[${requestId}] Successfully generated AI response with health context`);

    return new Response(
      JSON.stringify({ message: aiMessage }),
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