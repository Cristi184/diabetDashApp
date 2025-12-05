import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
};

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Request started:`, req.method, req.url);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error(`[${requestId}] Missing authorization header`);
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error(`[${requestId}] Invalid JSON body:`, e);
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { user_id } = body;

    if (!user_id) {
      console.error(`[${requestId}] Missing user_id in request`);
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${requestId}] Fetching profile for user:`, user_id);

    // Initialize Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get user details using service role
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(user_id);

    if (userError) {
      console.error(`[${requestId}] Error fetching user:`, userError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!user) {
      console.log(`[${requestId}] User not found:`, user_id);
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract profile information including diabetes_type, age, and weight
    const profile = {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name,
      role: user.user_metadata?.role,
      specialty: user.user_metadata?.specialty,
      clinic_name: user.user_metadata?.clinic_name,
      relation_to_patient: user.user_metadata?.relation_to_patient,
      diabetes_type: user.user_metadata?.diabetes_type,
      age: user.user_metadata?.age,
      weight: user.user_metadata?.weight,
    };

    console.log(`[${requestId}] Successfully fetched profile for:`, user.email);

    return new Response(
      JSON.stringify({ profile }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`[${requestId}] Unexpected error:`, error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});