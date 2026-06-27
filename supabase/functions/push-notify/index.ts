import { serve } from "std/http/server.ts";
import { createClient } from "supabase";
import * as jose from "jose";

/**
 * Gets an OAuth2 Access Token for the Firebase HTTP v1 API.
 */
async function getAccessToken(clientEmail: string, privateKey: string): Promise<string> {
  const tokenUrl = "https://oauth2.googleapis.com/token";
  const alg = "RS256";

  const jwt = await new jose.SignJWT({
    iss: clientEmail,
    sub: clientEmail,
    aud: tokenUrl,
    scope: "https://www.googleapis.com/auth/cloud-platform",
  })
    .setProtectedHeader({ alg, typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(await jose.importPKCS8(privateKey, alg));

  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: jwt,
  }).toString();

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || "Failed to get auth token");
  return data.access_token;
}

type FirebaseServiceAccountJson = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
};

type FamilyRow = {
  id: string;
  name?: string | null;
  fcm_token?: string | null;
  weather_lat?: number | null;
  weather_lng?: number | null;
  weather_location_name?: string | null;
};

type TokenRow = {
  token?: string | null;
  user_id?: string | null;
};

type WeatherSummary = {
  temp: number;
  code: number;
  isDay: number;
  description: string;
};

function weatherCodeToText(code: number, isDay: number): string {
  if (code === 0) return isDay ? "Sonnig" : "Klar";
  if (code >= 1 && code <= 3) return "Bewölkt";
  if (code >= 45 && code <= 48) return "Nebel";
  if (code >= 51 && code <= 67) return "Regen";
  if (code >= 71 && code <= 77) return "Schnee";
  if (code >= 80 && code <= 82) return "Starker Regen";
  if (code >= 95) return "Gewitter";
  return "Wetter-Update";
}

async function fetchWeatherSummary(lat: number, lng: number): Promise<WeatherSummary | null> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,is_day&timezone=auto`;
  const resp = await fetch(url);
  if (!resp.ok) return null;
  const data = await resp.json();
  const current = data?.current;
  if (!current) return null;

  const temp = Math.round(Number(current.temperature_2m ?? 0));
  const code = Number(current.weather_code ?? 0);
  const isDay = Number(current.is_day ?? 1);

  return {
    temp,
    code,
    isDay,
    description: weatherCodeToText(code, isDay),
  };
}

async function sendFcmMessage(
  accessToken: string,
  projectId: string,
  token: string,
  title: string,
  body: string,
  data: Record<string, string>,
) {
  return fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      message: {
        token,
        notification: { title, body },
        data,
        android: {
          priority: "high",
          notification: {
            channel_id: "familyhub_notifications",
            sound: "default",
            icon: "notification_icon",
          },
        },
      },
    }),
  });
}

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

async function collectRecipientTokens(supabase: ReturnType<typeof createClient>, excludeUserId?: string) {
  const tokenSet = new Set<string>();

  const { data: tokensData, error: tokensError } = await supabase.from("fcm_tokens").select("token, user_id");
  if (tokensError) {
    console.warn("fcm_tokens table read failed:", tokensError.message);
  } else {
    (tokensData || []).forEach((t: TokenRow) => {
      if (t?.token && t.user_id && t.user_id !== excludeUserId) {
        tokenSet.add(t.token);
      }
    });
  }

  const { data: familyTokens, error: familyTokensError } = await supabase.from("family").select("fcm_token, id");
  if (familyTokensError) {
    console.warn("family token read failed:", familyTokensError.message);
  } else {
    (familyTokens || []).forEach((t: FamilyRow) => {
      if (t?.fcm_token && t.id !== excludeUserId) {
        tokenSet.add(t.fcm_token);
      }
    });
  }

  return [...tokenSet];
}

async function collectWeatherRecipients(supabase: ReturnType<typeof createClient>) {
  const [familyResp, tokensResp, favsResp] = await Promise.all([
    supabase.from("family").select("id, name, fcm_token, weather_lat, weather_lng, weather_location_name"),
    supabase.from("fcm_tokens").select("token, user_id"),
    supabase.from("weather_favs").select("user_id, name, lat, lng"),
  ]);

  const familyRows = (familyResp.data || []) as FamilyRow[];
  const tokenRows = (tokensResp.data || []) as TokenRow[];
  const favRows = (favsResp.data || []) as Array<{ user_id?: string | null; name?: string | null; lat?: number | null; lng?: number | null }>;

  const tokensByUser = new Map<string, string[]>();
  for (const row of tokenRows) {
    if (!row.token || !row.user_id) continue;
    const list = tokensByUser.get(row.user_id) || [];
    list.push(row.token);
    tokensByUser.set(row.user_id, list);
  }

  for (const row of familyRows) {
    if (!row.fcm_token) continue;
    const list = tokensByUser.get(row.id) || [];
    list.push(row.fcm_token);
    tokensByUser.set(row.id, list);
  }

  const favByUser = new Map<string, { lat: number; lng: number; name: string }>();
  for (const fav of favRows) {
    if (!fav.user_id || favByUser.has(fav.user_id)) continue;
    if (typeof fav.lat !== "number" || typeof fav.lng !== "number") continue;
    favByUser.set(fav.user_id, {
      lat: fav.lat,
      lng: fav.lng,
      name: fav.name || "Standort",
    });
  }

  const recipients: Array<{
    userId: string;
    userName: string;
    tokens: string[];
    location: { lat: number; lng: number; name: string };
  }> = [];

  for (const row of familyRows) {
    const tokens = tokensByUser.get(row.id) || [];
    if (tokens.length === 0) continue;

    let location: { lat: number; lng: number; name: string } | null = null;
    if (typeof row.weather_lat === "number" && typeof row.weather_lng === "number") {
      location = {
        lat: row.weather_lat,
        lng: row.weather_lng,
        name: row.weather_location_name || row.name || "Standort",
      };
    } else {
      const fav = favByUser.get(row.id);
      if (fav) location = fav;
    }

    if (!location) continue;

    recipients.push({
      userId: row.id,
      userName: row.name || "Jemand",
      tokens,
      location,
    });
  }

  return recipients;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, x-my-custom-header",
      },
    });
  }

  try {
    const payload = await req.json();
    console.log("Payload received:", JSON.stringify(payload).substring(0, 200));

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey =
      Deno.env.get("FAMILYHUB_SUPABASE_SERVICE_ROLE_KEY") ||
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
      "";
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const table = String(payload.table || "");
    const type = String(payload.type || "").toUpperCase();
    const record = payload.record || {};
    const oldRecord = payload.old_record || {};
    const excludeUserId: string | undefined = payload.exclude_user_id;

    if (type === "DELETE") {
      return new Response("Skipping DELETE events", {
        status: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }

    const { clientEmail, privateKey, projectId } = resolveFirebaseCredentials();
    const accessToken = await getAccessToken(clientEmail, privateKey);

    if (payload.trigger === "weather_cron" || table === "weather_cron") {
      const recipients = await collectWeatherRecipients(supabase);
      const weatherCache = new Map<string, WeatherSummary | null>();
      const results: any[] = [];

      for (const recipient of recipients) {
        const cacheKey = `${recipient.location.lat}:${recipient.location.lng}`;
        if (!weatherCache.has(cacheKey)) {
          weatherCache.set(cacheKey, await fetchWeatherSummary(recipient.location.lat, recipient.location.lng));
        }

        const weather = weatherCache.get(cacheKey);
        if (!weather) continue;

        const title = `Wetter in ${recipient.location.name}`;
        const body = `${weather.temp}°C · ${weather.description}`;
        const data = {
          type: "weather",
          user_id: recipient.userId,
          location: recipient.location.name,
          temp: String(weather.temp),
          weather_code: String(weather.code),
        };

        for (const token of recipient.tokens) {
          const resp = await sendFcmMessage(accessToken, projectId, token, title, body, data);
          const respData = await resp.json().catch(() => ({}));
          if (!resp.ok) {
            console.warn("Weather push failed for token", token.substring(0, 20), respData);
          }
          results.push({ token: token.substring(0, 20) + "...", ok: resp.ok, status: resp.status, userId: recipient.userId });
        }
      }

      return new Response(JSON.stringify({
        success: true,
        trigger: "weather_cron",
        sent_to: results.length,
        results,
      }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    let notificationTitle = "FamilyHub";
    let notificationBody = "Es gibt ein Update!";

    if (payload.trigger === "manual_broadcast") {
      notificationTitle = payload.title || "Mitteilung";
      notificationBody = payload.body || "Es gibt eine neue Nachricht.";
    } else {
      let authorName = "Jemand";
      const assignedRaw = record?.assigned_to ?? record?.assignedTo ?? [];
      const assignedIds = Array.isArray(assignedRaw)
        ? assignedRaw.filter((x: unknown): x is string => typeof x === "string")
        : (typeof assignedRaw === "string" ? [assignedRaw] : []);
      const authorId = record?.author_id || record?.authorId || record?.requested_by || record?.requestedBy || record?.user_id || record?.userId;

      if (authorId) {
        const { data: famData } = await supabase.from("family").select("name").eq("id", authorId).single();
        if (famData?.name) authorName = famData.name;
      }

      const assignedNames = assignedIds.length > 0
        ? await (async () => {
          const { data: assignees } = await supabase.from("family").select("id, name").in("id", assignedIds);
          const map = new Map((assignees || []).map((row: any) => [row.id, row.name as string]));
          return assignedIds.map((id) => map.get(id)).filter((name): name is string => !!name);
        })()
        : [];

      switch (table) {
        case "events":
          if (type !== "INSERT" && type !== "UPDATE") return new Response("Skipped event update", { status: 200, headers: { "Access-Control-Allow-Origin": "*" } });
          notificationTitle = "📅 Neuer Termin";
          notificationBody = `${authorName} hat "${record?.title || "Termin"}" eingetragen.`;
          break;
        case "shopping":
          if (type !== "INSERT") return new Response("Skipped shopping update", { status: 200, headers: { "Access-Control-Allow-Origin": "*" } });
          notificationTitle = "🛒 Einkaufsliste";
          notificationBody = `${authorName} hat "${record?.name || "Artikel"}" zur Einkaufsliste hinzugefügt.`;
          break;
        case "household_tasks":
          if (type !== "INSERT") return new Response("Skipped task update", { status: 200, headers: { "Access-Control-Allow-Origin": "*" } });
          notificationTitle = "🧹 Neue Hausarbeit";
          notificationBody = assignedNames.length > 0
            ? `${authorName} hat "${record?.title || "Aufgabe"}" für ${assignedNames.join(", ")} erstellt.`
            : `${authorName} hat "${record?.title || "Aufgabe"}" erstellt.`;
          break;
        case "personal_tasks":
          if (type !== "INSERT") return new Response("Skipped task update", { status: 200, headers: { "Access-Control-Allow-Origin": "*" } });
          notificationTitle = "✅ Neue Aufgabe";
          notificationBody = `${authorName} hat "${record?.title || "Aufgabe"}" erstellt.`;
          break;
        case "news":
          if (type !== "INSERT") return new Response("Skipped news update", { status: 200, headers: { "Access-Control-Allow-Origin": "*" } });
          notificationTitle = "📰 Neue News";
          notificationBody = `${authorName} hat "${record?.title || "Neuigkeit"}" veröffentlicht.`;
          break;
        case "polls":
          if (type !== "INSERT") return new Response("Skipped poll update", { status: 200, headers: { "Access-Control-Allow-Origin": "*" } });
          notificationTitle = "📊 Neue Umfrage";
          notificationBody = `${authorName} hat "${record?.question || record?.title || "Umfrage"}" erstellt.`;
          break;
        case "meal_requests":
          if (type !== "INSERT") return new Response("Skipped meal request update", { status: 200, headers: { "Access-Control-Allow-Origin": "*" } });
          notificationTitle = "🍽️ Essenswunsch";
          notificationBody = `${authorName} wünscht sich "${record?.dish_name || record?.dishName || "Gericht"}".`;
          break;
        case "app_settings":
          if (type !== "UPDATE") return new Response("Skipped settings update", { status: 200, headers: { "Access-Control-Allow-Origin": "*" } });
          if (record?.push_test_at && record?.push_test_at !== oldRecord?.push_test_at) {
            notificationTitle = record?.push_test_title || "🔔 Push-Test";
            notificationBody = record?.push_test_message || "Das ist eine Test-Benachrichtigung von FamilyHub.";
            break;
          }
          if (record?.maintenance_mode === true && oldRecord?.maintenance_mode !== true) {
            notificationTitle = "🔧 Wartungsmodus aktiv";
            notificationBody = "FamilyHub ist kurz offline. Wir sind gleich wieder da.";
          } else if (record?.maintenance_mode === false && oldRecord?.maintenance_mode === true) {
            notificationTitle = "✅ Wartung beendet";
            notificationBody = "FamilyHub ist wieder online.";
          } else {
            return new Response("Skipped settings update", { status: 200, headers: { "Access-Control-Allow-Origin": "*" } });
          }
          break;
        default:
          return new Response("Unknown table", { status: 200, headers: { "Access-Control-Allow-Origin": "*" } });
      }
    }

    const tokens = await collectRecipientTokens(supabase, excludeUserId);
    if (tokens.length === 0) {
      console.log("No target tokens found");
      return new Response(JSON.stringify({ success: true, message: "No tokens to notify" }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const notificationData = {
      click_action: "FLUTTER_NOTIFICATION_CLICK",
      table: table || "broadcast",
      type: type || "manual",
    };

    console.log(`Sending push to ${tokens.length} device(s): "${notificationTitle}" - "${notificationBody}"`);

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
        const resp = await sendFcmMessage(accessToken, projectId, token, notificationTitle, notificationBody, notificationData);
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok && isInvalidFcmToken(data)) {
          console.log(`Removing stale token: ${token.substring(0, 20)}...`);
          await supabase.from("fcm_tokens").delete().eq("token", token);
        }
        return { token: token.substring(0, 20) + "...", status: resp.status, ok: resp.ok };
      } catch (e) {
        return { token: token.substring(0, 20) + "...", error: String(e) };
      }
    }));

    return new Response(JSON.stringify({
      success: true,
      notification: { title: notificationTitle, body: notificationBody },
      sent_to: tokens.length,
      results,
    }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    console.error("Critical error in edge function:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
