/**
 * Required Supabase secrets (set via `supabase secrets set`):
 *   INTERNAL_JOB_SECRET — matches INTERNAL_JOB_SECRET in NestJS API
 *   API_URL             — base URL of the NestJS API (e.g. https://api.example.com)
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

serve(async () => {
  const secret = Deno.env.get('INTERNAL_JOB_SECRET');
  const apiUrl = Deno.env.get('API_URL');

  if (!secret || !apiUrl) {
    console.error('Missing required env vars: INTERNAL_JOB_SECRET, API_URL');
    return new Response('Missing configuration', { status: 500 });
  }

  const url = `${apiUrl}/internal/weekly-absence-check`;
  console.log(`Triggering weekly absence check at ${url}`);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'X-Internal-Secret': secret },
    });
  } catch (err) {
    console.error('Failed to call weekly-absence-check endpoint:', err);
    return new Response('Failed to reach API', { status: 502 });
  }

  const body = await response.text();
  console.log(`Response status: ${response.status}, body: ${body}`);

  if (response.status >= 400) {
    console.error(`weekly-absence-check returned error: ${response.status}`);
    return new Response(body, { status: response.status });
  }

  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
