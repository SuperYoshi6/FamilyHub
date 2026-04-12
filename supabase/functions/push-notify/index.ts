import { serve } from "std/http/server.ts";
import { createClient } from "supabase";
import * as jose from "jose";

/**
 * Gets an OAuth2 Access Token for the Firebase HTTP v1 API.
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

  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: jwt,
  }).toString();

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || 'Failed to get auth token');
  return data.access_token;
}

/** Erwartete Felder aus der Firebase/Google Service-Account-JSON-Datei */
type FirebaseServiceAccountJson = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
};

/**
 * Liest Firebase-Zugangsdaten – in dieser Reihenfolge:
 * 1) FIREBASE_SERVICE_ACCOUNT_B64 = komplette JSON-Datei, Base64-kodiert (empfohlen für Secrets)
 * 2) FIREBASE_SERVICE_ACCOUNT_JSON = kompletter JSON-String (einzeilig oder mehrzeilig)
 * 3) FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY + optional FIREBASE_PROJECT_ID
 */
function resolveFirebaseCredentials(): { clientEmail: string; privateKey: string; projectId: string } {
  const b64 = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_B64")?.trim();
  if (b64) {
    try {
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const json = new TextDecoder().decode(bytes);
      const sa = JSON.parse(json) as FirebaseServiceAccountJson;
      if (!sa.client_email || !sa.private_key) {
        throw new Error("JSON enthält client_email oder private_key nicht.");
      }
      return {
        clientEmail: sa.client_email,
        privateKey: sa.private_key.replace(/\\n/g, "\n"),
        projectId: sa.project_id || Deno.env.get("FIREBASE_PROJECT_ID") || "familyhub-notification",
      };
    } catch (e) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_B64 konnte nicht gelesen werden: " + String(e));
    }
  }

  const raw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON")?.trim();
  if (raw) {
    try {
      const sa = JSON.parse(raw) as FirebaseServiceAccountJson;
      if (!sa.client_email || !sa.private_key) {
        throw new Error("JSON enthält client_email oder private_key nicht.");
      }
      return {
        clientEmail: sa.client_email,
        privateKey: sa.private_key.replace(/\\n/g, "\n"),
        projectId: sa.project_id || Deno.env.get("FIREBASE_PROJECT_ID") || "familyhub-notification",
      };
    } catch (e) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON ist kein gültiges JSON: " + String(e));
    }
  }

  const clientEmail = Deno.env.get("FIREBASE_CLIENT_EMAIL");
  let privateKey = Deno.env.get("FIREBASE_PRIVATE_KEY");
  const projectId = Deno.env.get("FIREBASE_PROJECT_ID") || "familyhub-notification";

  if (!clientEmail || !privateKey) {
    throw new Error(
      "Firebase-Zugang fehlt: Secret FIREBASE_SERVICE_ACCOUNT_B64 (empfohlen), oder FIREBASE_SERVICE_ACCOUNT_JSON, oder FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY setzen.",
    );
  }
  privateKey = privateKey.replace(/\\n/g, "\n");
  return { clientEmail, privateKey, projectId };
}

serve(async (req) => {
  try {
    const payload = await req.json();
    console.log("Webhook payload received:", payload);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ? '';
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1. Fetch all tokens (primary table + fallback to family.fcm_token)
    const tokenSet = new Set<string>();
    const { data: tokensData, error: tokensError } = await supabase.from('fcm_tokens').select('token');
    if (tokensError) {
      console.warn('fcm_tokens table read failed:', tokensError.message);
    } else {
      (tokensData || []).forEach((t: { token?: string }) => { if (t?.token) tokenSet.add(t.token); });
    }

    // Fallback: read tokens stored on family rows
    const { data: familyTokens, error: familyTokensError } = await supabase.from('family').select('fcm_token');
    if (familyTokensError) {
      console.warn('family token read failed:', familyTokensError.message);
    } else {
      (familyTokens || []).forEach((t: { fcm_token?: string }) => { if (t?.fcm_token) tokenSet.add(t.fcm_token); });
    }

    const tokens = [...tokenSet];
    if (tokens.length === 0) {
      return new Response("No target tokens found", { status: 200 });
    }

    const table = String(payload.table || '');
    const type = String(payload.type || '').toUpperCase();
    const record = payload.record;
    
    // We don't want to notify on typical "checked/unchecked" updates for shopping/tasks 
    // unless it's a specific requirement. For now, focus on new items and major updates.
    if (type === "DELETE") return new Response("Skipping DELETE events", { status: 200 });

    let authorName = "Jemand";
    const assigned = record?.assigned_to;
    const assignedFirst = Array.isArray(assigned) ? assigned[0] : assigned;
    const authorId =
      record?.author_id ||
      assignedFirst ||
      record?.requested_by ||
      record?.user_id;
    
    if (authorId) {
      const { data: famData } = await supabase.from('family').select('name').eq('id', authorId).single();
      if (famData) authorName = famData.name;
    }

    let notificationTitle = "Neuigkeit im FamilyHub";
    let notificationBody = "Es gibt ein Update!";

    // Type-based mapping
    switch (table) {
      case "events":
        notificationTitle = type === "INSERT" ? "Neuer Termin" : "Termin geändert";
        notificationBody = `${authorName} ${type === "INSERT" ? 'hat erstellt' : 'hat geändert'}: "${record?.title ? ''}"`;
        break;
      case "shopping":
        if (type !== "INSERT") return new Response("Skipped shopping update", { status: 200 });
        notificationTitle = "Einkaufsliste";
        notificationBody = `${authorName} hat "${record.name}" hinzugefügt.`;
        break;
      case "household_tasks":
      case "personal_tasks":
        if (type !== "INSERT") return new Response("Skipped task update", { status: 200 });
        notificationTitle = "Neue Aufgabe";
        notificationBody = `${authorName} hat "${record.title}" erstellt.`;
        break;
      case "news":
        if (type !== "INSERT") return new Response("Skipped news update", { status: 200 });
        notificationTitle = "Pinnwand";
        notificationBody = `${authorName}: "${record.title}"`;
        break;
      case "polls":
        if (type !== "INSERT") return new Response("Skipped poll update", { status: 200 });
        notificationTitle = "Neue Umfrage";
        notificationBody = `${authorName} möchte wissen: "${record.question}"`;
        break;
      case "meal_requests":
        if (type !== "INSERT") return new Response("Skipped meal request update", { status: 200 });
        notificationTitle = "Essenswunsch";
        notificationBody = `${authorName} wünscht sich "${record.dish_name || record.dishName}".`;
        break;
      case "feedback":
        if (type !== "INSERT") return new Response("Skipped feedback update", { status: 200 });
        notificationTitle = "Neues Feedback";
        notificationBody = `${authorName} hat Feedback gesendet.`;
        break;
      case "weather_cron":
        notificationTitle = "Wetter-Update";
        notificationBody = "Überprüfe das aktuelle Wetter im FamilyHub.";
        break;
      default:
        // Handle custom triggers if needed
        if (payload.trigger === "manual_broadcast") {
          notificationTitle = payload.title || "Mitteilung";
          notificationBody = payload.body || "Es gibt eine neue Nachricht.";
        } else {
          return new Response("Unknown table or trigger", { status: 200 });
        }
    }

    // 2. Prepare Auth (ein Secret mit ganzer JSON-Datei: FIREBASE_SERVICE_ACCOUNT_B64)
    const { clientEmail, privateKey, projectId } = resolveFirebaseCredentials();
    const accessToken = await getAccessToken(clientEmail, privateKey);

    // 3. Send Notifications via V1 API
    const isInvalidFcmToken = (data: unknown): boolean => {
      const err = data && typeof data === "object" && "error" in data
        ? (data as { error?: { status?: string; message?: string; details?: { errorCode?: string }[] } }).error
        : undefined;
      if (!err) return false;
      const msg = (err.message || "").toUpperCase();
      if (err.status === "NOT_FOUND" || msg.includes("UNREGISTERED") || msg.includes("NOT A VALID FCM")) {
        return true;
      }
      const details = err.details;
      if (Array.isArray(details)) {
        return details.some((d) => d?.errorCode === "UNREGISTERED");
      }
      return false;
    };

    const results = await Promise.all(tokens.map(async (token) => {
      try {
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
                click_action: "FLUTTER_NOTIFICATION_CLICK",
                table: table || "unknown",
                type: type || "unknown"
              },
              android: {
                priority: "high",
                notification: {
                  channel_id: "familyhub_notifications",
                  sound: "default"
                }
              }
            }
          })
        });
        const data = await resp.json();
        if (!resp.ok && isInvalidFcmToken(data)) {
          await supabase.from("fcm_tokens").delete().eq("token", token);
        }
        return { token, status: resp.status, data };
      } catch (e) {
        return { token, error: String(e) };
      }
    }));

    return new Response(JSON.stringify({ 
      success: true, 
      notification: { title: notificationTitle, body: notificationBody },
      results 
    }), { headers: { "Content-Type": "application/json" } });

  } catch (err) {
    console.error("Critical error in edge function:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
