import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Request received:`, {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries()),
  });

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
      },
    });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error(`[${requestId}] Missing Authorization header`);
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error(`[${requestId}] Authentication failed:`, authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        }
      );
    }

    console.log(`[${requestId}] User authenticated:`, user.id);

    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error(`[${requestId}] Invalid JSON body:`, e);
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        }
      );
    }

    const { code, relation_type } = body;

    if (!code || !relation_type) {
      console.error(`[${requestId}] Missing required fields`);
      return new Response(
        JSON.stringify({ error: 'Missing code or relation_type' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        }
      );
    }

    if (!['doctor', 'nutritionist', 'family'].includes(relation_type)) {
      console.error(`[${requestId}] Invalid relation_type:`, relation_type);
      return new Response(
        JSON.stringify({ error: 'Invalid relation_type' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        }
      );
    }

    // Find valid invite code
    const { data: inviteCode, error: findError } = await supabase
      .from('app_adf262f319_invite_codes')
      .select('*')
      .eq('code', code)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (findError || !inviteCode) {
      console.error(`[${requestId}] Invalid or expired code:`, findError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired invite code' }),
        { 
          status: 404,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        }
      );
    }

    // Check if caregiver is trying to connect to themselves
    if (inviteCode.patient_id === user.id) {
      console.error(`[${requestId}] User trying to connect to themselves`);
      return new Response(
        JSON.stringify({ error: 'Cannot connect to yourself' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        }
      );
    }

    // Check if relationship already exists
    const { data: existingRelation } = await supabase
      .from('app_adf262f319_care_relations')
      .select('id')
      .eq('caregiver_id', user.id)
      .eq('patient_id', inviteCode.patient_id)
      .single();

    if (existingRelation) {
      console.log(`[${requestId}] Relationship already exists`);
      return new Response(
        JSON.stringify({ error: 'You are already connected to this patient' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        }
      );
    }

    // Create care relationship
    const { data: careRelation, error: relationError } = await supabase
      .from('app_adf262f319_care_relations')
      .insert({
        caregiver_id: user.id,
        patient_id: inviteCode.patient_id,
        relation_type: relation_type,
      })
      .select()
      .single();

    if (relationError) {
      console.error(`[${requestId}] Error creating care relationship:`, relationError);
      return new Response(
        JSON.stringify({ error: 'Failed to create care relationship' }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        }
      );
    }

    // Mark invite code as used
    await supabase
      .from('app_adf262f319_invite_codes')
      .update({ used: true })
      .eq('id', inviteCode.id);

    console.log(`[${requestId}] Care relationship created successfully`);

    return new Response(
      JSON.stringify({ 
        success: true,
        care_relation: careRelation
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      }
    );

  } catch (error) {
    console.error(`[${requestId}] Unexpected error:`, error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      }
    );
  }
});