import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { message, user_id } = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // System prompt for diabetes management assistant
    const systemPrompt = `You are a helpful and empathetic diabetes management assistant. Your role is to:

1. Provide general information about diabetes management, including:
   - Blood glucose monitoring and target ranges
   - Carbohydrate counting and meal planning
   - Exercise recommendations
   - Medication adherence tips
   - Lifestyle modifications

2. Offer emotional support and encouragement for diabetes management

3. IMPORTANT LIMITATIONS:
   - Always remind users that you are NOT a replacement for medical advice
   - Never diagnose conditions or recommend specific medications
   - For urgent concerns (severe hypoglycemia, hyperglycemia, DKA symptoms), immediately advise seeking emergency medical care
   - Encourage users to consult their healthcare provider for personalized medical advice

4. Communication style:
   - Be warm, supportive, and non-judgmental
   - Use clear, simple language
   - Provide practical, actionable tips
   - Ask clarifying questions when needed

Keep responses concise (2-3 paragraphs maximum) and focused on the user's question.`;

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      throw new Error('Failed to get AI response');
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content || 'I apologize, but I could not generate a response. Please try again.';

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in AI chat function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        response: 'I apologize, but I\'m experiencing technical difficulties. Please try again later or consult with your healthcare provider for immediate concerns.'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});