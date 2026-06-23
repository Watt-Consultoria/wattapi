/**
 * Required Supabase secrets (set via `supabase secrets set`):
 *   VAPID_PUBLIC_KEY   — base64url-encoded VAPID public key
 *   VAPID_PRIVATE_KEY  — base64url-encoded VAPID private key
 *
 * Built-in Supabase secrets used automatically:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * VAPID subject: must be a mailto: or https: URI identifying the sender.
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import webpush from 'npm:web-push@3';

interface DatabaseWebhookPayload {
  record: {
    id: string;
    user_id: string;
    title: string;
    description: string | null;
  };
  type: string;
  table: string;
  schema: string;
}

interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

serve(async (req: Request) => {
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.error(
      'Missing required secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY',
    );
    return new Response('Missing VAPID configuration', { status: 500 });
  }

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      'Missing required secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY',
    );
    return new Response('Missing Supabase configuration', { status: 500 });
  }

  webpush.setVapidDetails(
    'mailto:wattconsultoria.contas@gmail.com',
    vapidPublicKey,
    vapidPrivateKey,
  );

  let payload: DatabaseWebhookPayload;
  try {
    payload = (await req.json()) as DatabaseWebhookPayload;
  } catch {
    console.error('Failed to parse webhook payload');
    return new Response('Invalid payload', { status: 400 });
  }

  const { record } = payload;
  if (!record?.user_id) {
    console.error('Webhook payload missing record.user_id');
    return new Response('Invalid webhook payload', { status: 400 });
  }

  const subsResponse = await fetch(
    `${supabaseUrl}/rest/v1/push_subscriptions?user_id=eq.${record.user_id}&deleted_at=is.null&select=id,endpoint,p256dh,auth`,
    {
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
      },
    },
  );

  if (!subsResponse.ok) {
    console.error(`Failed to fetch subscriptions: ${subsResponse.status}`);
    return new Response('Failed to fetch subscriptions', { status: 502 });
  }

  const subscriptions = (await subsResponse.json()) as PushSubscriptionRow[];

  if (subscriptions.length === 0) {
    console.log(`No active subscriptions for user ${record.user_id}`);
    return new Response(JSON.stringify({ sent: 0 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const pushPayload = JSON.stringify({
    title: record.title,
    ...(record.description != null ? { body: record.description } : {}),
  });

  let sent = 0;
  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          pushPayload,
        );
        sent++;
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 410) {
          console.log(`Subscription ${sub.id} expired (410), soft-deleting`);
          await fetch(
            `${supabaseUrl}/rest/v1/push_subscriptions?id=eq.${sub.id}`,
            {
              method: 'PATCH',
              headers: {
                Authorization: `Bearer ${serviceRoleKey}`,
                apikey: serviceRoleKey,
                'Content-Type': 'application/json',
                Prefer: 'return=minimal',
              },
              body: JSON.stringify({ deleted_at: new Date().toISOString() }),
            },
          );
        } else {
          console.error(`Failed to send push to subscription ${sub.id}:`, err);
        }
      }
    }),
  );

  return new Response(JSON.stringify({ sent }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
