import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as jose from "https://deno.land/x/jose@v4.14.4/index.ts";

/**
 * Holt einen OAuth2 Access Token für die Firebase HTTP v1 API,
 * indem es einen JWT mit dem Service Account Secret signiert.
 */
async function getAccessToken(clientEmail: string, privateKey: string): Promise<string> {
  const tokenUrl = 'https://oauth2.googleapis.com/token';
  const alg = 'RS256';

  const jwt = await new jose.SignJWT({
    iss: clientEmail,
    sub: clientEmail,
    aud: tokenUrl,
    scope: 'https://www.googleapis.com/auth/cloud-platform'
  })
    .setProtectedHeader({ alg, typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(await jose.importPKCS8(privateKey, alg));

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || 'Failed to get auth token');
  return data.access_token;
}

// ==========================================
// PUSH NOTIFICATION EDGE FUNCTION (FCM HTTP v1 API)
// Deploy with: supabase functions deploy push-notify
// ==========================================

console.log("Push Notification Edge Function started");

serve(async (req) => {
  try {
    const payload = await req.json();
    console.log("Webhook payload:", payload);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: tokensData } = await supabase.from('fcm_tokens').select('token');
    const tokens = tokensData?.map(t => t.token) || [];
    if (tokens.length === 0) {
      return new Response("No target tokens found", { status: 200 });
    }

    let authorName = "Jemand";
    const record = payload.record;

    let authorId = record.author_id || record.assigned_to || record.requested_by || record.user_id;
    if (authorId) {
      const { data: famData } = await supabase.from('family').select('name').eq('id', authorId).single();
      if (famData) authorName = famData.name;
    }

    let notificationTitle = `Eine Neuigkeit wurde von ${authorName} gepostet`;
    let notificationBody = `${record.title || ''}`;
    const table = payload.table;

    // Ereignisweises Text-Mapping
    if (table === "events") {
      if (payload.type === "INSERT") {
        notificationTitle = "Neuer Termin";
        notificationBody = `${authorName} hat den Termin "${record.title}" erstellt.`;
      } else if (payload.type === "UPDATE") {
        notificationTitle = "Termin geändert";
        notificationBody = `Der Termin "${record.title}" wurde von ${authorName} geändert.`;
      }
    } else if (table === "meal_requests" && payload.type === "INSERT") {
      notificationTitle = "Neuer Essenswunsch";
      notificationBody = `${authorName} wünscht sich "${record.dish_name}".`;
    } else if (table === "household_tasks" && payload.type === "INSERT") {
      notificationTitle = "Neue Hausarbeit";
      notificationBody = `Eine neue Aufgabe wurde erstellt: "${record.title}".`;
    } else if (table === "shopping" && payload.type === "INSERT") {
      notificationTitle = "Einkaufsliste aktualisiert";
      notificationBody = `"${record.name}" wurde zur Einkaufsliste hinzugefügt.`;
    } else if (table === "news" && payload.type === "INSERT") {
      notificationTitle = "Neue Pinwand-Nachricht";
      notificationBody = `${authorName} hat etwas Neues geteilt: "${record.title}"`;
    } else if (table === "polls" && payload.type === "INSERT") {
      notificationTitle = "Neue Umfrage";
      notificationBody = `${authorName} hat eine neue Umfrage gestartet: "${record.question}". ${record.starts_at ? `Startet am: ${new Date(record.starts_at).toLocaleDateString()}` : 'Mach gleich mit!'}`;
    } else if (table === "weather_cron") {
      notificationTitle = "Stündliches Wetter-Update";
      notificationBody = "Überprüfe das Wetter für deine hinterlegten Orte.";
    } else {
      return new Response("Unknown table/event", { status: 200 });
    }

    // 4. HOL DIE TOKENS FÜR FIREBASE HTTP V1 API
    const clientEmail = Deno.env.get("FIREBASE_CLIENT_EMAIL");
    let privateKey = Deno.env.get("FIREBASE_PRIVATE_KEY");
    const projectId = Deno.env.get("FIREBASE_PROJECT_ID") || "familyhub-notification";

    if (!clientEmail || !privateKey) {
      throw new Error("Missing FIREBASE_CLIENT_EMAIL or FIREBASE_PRIVATE_KEY in Edge Function secrets.");
    }
    
    // Private Key Formatierung fixen (manche environments escapen \n komisch)
    privateKey = privateKey.replace(/\\n/g, '\n');

    // OAuth2 Bearer Token generieren
    const accessToken = await getAccessToken(clientEmail, privateKey);

    // V1 API unterstützt nur eine Message pro Aufruf (oder Multi über Batches, was wir per Promise.all simulieren)
    const responses = await Promise.all(tokens.map(async (token) => {
      const resp = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          message: {
            token: token,
            notification: {
              title: notificationTitle,
              body: notificationBody
            },
            data: {
              table: table
            }
          }
        })
      });
      return resp.json();
    }));

    return new Response(JSON.stringify({ success: true, notification: { title: notificationTitle, body: notificationBody }, results: responses }), { headers: { "Content-Type": "application/json" } });

  } catch (err) {
    console.error("Error processing notification:", err);
    return new Response(String(err), { status: 500 });
  }
});
