// @ts-ignore: Deno std library import - allow unresolved module in this TypeScript environment
import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
// @ts-ignore: Deno supabase-js import - allow unresolved module in this TypeScript environment
import { createClient } from "https://esm.sh/@supabase/supabase-js?no-check";
// @ts-ignore: Deno jose import - allow unresolved module in this TypeScript environment
import * as jose from "https://esm.sh/jose@4.15.3?no-check";

function formatDate(isoDate: string | undefined | null): string {
  if (!isoDate) return "Datum";
  const parts = isoDate.split("T")[0].split("-");
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

const TABLE_ROUTE_MAP: Record<string, string> = {
  events: "calendar",
  shopping: "lists",
  household_tasks: "lists",
  personal_tasks: "lists",
  meal_requests: "meals",
  meal_plan: "meals",
  meal_plans: "meals",
  news: "calendar",
  polls: "calendar",
  app_settings: "settings",
  weather_cron: "weather",
};

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
  const b64 = process.env["FIREBASE_SERVICE_ACCOUNT_B64"]?.trim();
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
        projectId: sa.project_id || process.env["FIREBASE_PROJECT_ID"] || "familyhub-notification",
      };
    } catch (e) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_B64 konnte nicht gelesen werden: " + String(e));
    }
  }

  const raw = process.env["FIREBASE_SERVICE_ACCOUNT_JSON"]?.trim();
  if (raw) {
    try {
      const sa = JSON.parse(raw) as FirebaseServiceAccountJson;
      if (!sa.client_email || !sa.private_key) {
        throw new Error("JSON enthält client_email oder private_key nicht.");
      }
      return {
        clientEmail: sa.client_email,
        privateKey: sa.private_key.replace(/\\n/g, "\n"),
        projectId: sa.project_id || process.env["FIREBASE_PROJECT_ID"] || "familyhub-notification",
      };
    } catch (e) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON ist kein gültiges JSON: " + String(e));
    }
  }

  const clientEmail = process.env["FIREBASE_CLIENT_EMAIL"];
  let privateKey = process.env["FIREBASE_PRIVATE_KEY"];
  const projectId = process.env["FIREBASE_PROJECT_ID"] || "familyhub-notification";

  if (!clientEmail || !privateKey) {
    throw new Error(
      "Firebase-Zugang fehlt: Secret FIREBASE_SERVICE_ACCOUNT_B64 (empfohlen), oder FIREBASE_SERVICE_ACCOUNT_JSON, oder FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY setzen.",
    );
  }
  privateKey = privateKey.replace(/\\n/g, "\n");
  return { clientEmail, privateKey, projectId };
}

// Map table names to notification_preferences column names
const TABLE_TO_PREFS_KEY: Record<string, string> = {
  events: "events",
  shopping: "shopping",
  household_tasks: "household_tasks",
  personal_tasks: "personal_tasks",
  news: "news",
  polls: "polls",
  meal_requests: "meal_requests",
};

async function collectRecipientTokens(supabase: ReturnType<typeof createClient>, excludeUserId?: string, table?: string) {
  const tokenSet = new Map<string, string>(); // token → source

  // Always exclude admin users (they should never receive pushes)
  const { data: adminUsers } = await supabase.from("family").select("id").eq("role", "admin");
  const adminUserIds = new Set<string>((adminUsers || []).map((r: any) => r.id));

  // Determine which users are excluded by notification_preferences
  const prefsKey = table ? TABLE_TO_PREFS_KEY[table] : undefined;
  let disabledUserIds = new Set<string>(adminUserIds);
  if (prefsKey) {
    // Must select the category column explicitly, not just user_id
    const { data: prefsData } = await supabase
      .from("notification_preferences")
      .select(`user_id, ${prefsKey}`);
    if (prefsData) {
      for (const row of prefsData) {
        const val = (row as any)[prefsKey];
        if (val === false) {
          disabledUserIds.add(row.user_id as string);
        }
      }
    }
    console.log(`[push-notify] Table "${table}" → prefs key "${prefsKey}", ${disabledUserIds.size} user(s) disabled push for this category`);
  }

  // Only use fcm_tokens table (authoritative) — no fallback to family.fcm_token to avoid duplicates
  const { data: tokensData, error: tokensError } = await supabase.from("fcm_tokens").select("token, user_id");
  if (tokensError) {
    console.warn("[push-notify] fcm_tokens table read failed:", tokensError.message);
  } else {
    (tokensData || []).forEach((t: TokenRow) => {
      if (t?.token && t.user_id && t.user_id !== excludeUserId && !disabledUserIds.has(t.user_id)) {
        tokenSet.set(t.token, "fcm_tokens");
      }
    });
  }

  // Log sources for debugging
  if (tokenSet.size > 0) {
    for (const [token, source] of tokenSet) {
      console.log(`[push-notify] Token ${token.substring(0, 20)}... from ${source}`);
    }
  }

  return [...tokenSet.keys()];
}

async function collectWeatherRecipients(supabase: ReturnType<typeof createClient>) {
  // Check which users have weather notifications disabled
  const { data: prefsData } = await supabase
    .from("notification_preferences")
    .select("user_id, weather");
  const weatherDisabled = new Set<string>(
    (prefsData || []).filter((r: any) => r.weather === false).map((r: any) => r.user_id)
  );

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

    // Skip users who disabled weather notifications
    if (weatherDisabled.has(row.id)) continue;

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

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-my-custom-header",
      },
    });
  }

  try {
    const payload = await req.json();
    console.log("Payload received:", JSON.stringify(payload).substring(0, 200));

    const supabaseUrl = process.env["SUPABASE_URL"] || "";
    const supabaseKey =
      process.env["FAMILYHUB_SUPABASE_SERVICE_ROLE_KEY"] ||
      process.env["SUPABASE_SERVICE_ROLE_KEY"] ||
      "";
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const table = String(payload.table || "");
    const type = String(payload.type || "").toUpperCase();
    const record = payload.record || {};
    const oldRecord = payload.old_record || {};
    const excludeUserId: string | undefined = payload.exclude_user_id;

    // Nur DELETE für Events, Shopping, Tasks, Meal-Requests, Meal-Plan
    const deleteAllowed = ["events", "shopping", "household_tasks", "personal_tasks", "meal_requests", "meal_plan"];
    if (type === "DELETE" && !deleteAllowed.includes(table)) {
      return new Response("Skipping DELETE for " + table, {
        status: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }

    const { clientEmail, privateKey, projectId } = resolveFirebaseCredentials();
    const accessToken = await getAccessToken(clientEmail, privateKey);

    if (payload.trigger === "weather_cron" || table === "weather_cron") {
      const recipients = await collectWeatherRecipients(supabase);
      console.log(`[push-notify] Weather cron: ${recipients.length} recipient(s) found`);

      if (recipients.length === 0) {
        return new Response(JSON.stringify({
          success: true,
          trigger: "weather_cron",
          message: "No recipients — users need to set a weather location or save a favorite",
          sent_to: 0,
        }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

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
          route: "weather",
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
        const { data: famData } = await supabase.from("family").select("name").eq("id", authorId).maybeSingle();
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
          if (type === "INSERT") {
            notificationTitle = "📅 Neuer Termin";
            notificationBody = `${authorName} hat "${record?.title || "Termin"}" am ${formatDate(record?.date)} eingetragen.`;
          } else if (type === "UPDATE") {
            notificationTitle = "📅🔁 Termin geändert";
            notificationBody = `${authorName} hat "${record?.title || "Termin"}" am ${formatDate(record?.date)} bearbeitet.`;
          } else if (type === "DELETE") {
            notificationTitle = "📅❌ Termin gelöscht";
            notificationBody = `${authorName} hat "${oldRecord?.title || "Termin"}" am ${formatDate(oldRecord?.date)} gelöscht.`;
          } else {
            return new Response("Skipped event " + type, { status: 200, headers: { "Access-Control-Allow-Origin": "*" } });
          }
          break;
        case "shopping": {
          if (type === "DELETE") {
            notificationTitle = "🛒❌ Einkauf entfernt";
            notificationBody = `${authorName} hat "${oldRecord?.name || "Artikel"}" von der Einkaufsliste entfernt.`;
          } else if (type !== "INSERT") {
            return new Response("Skipped shopping update", { status: 200, headers: { "Access-Control-Allow-Origin": "*" } });
          } else {
            notificationTitle = "🛒 Einkaufsliste";
            notificationBody = `${authorName} hat "${record?.name || "Artikel"}" zur Einkaufsliste hinzugefügt.`;
          }
          break;
        }
        case "household_tasks":
          if (type === "UPDATE") {
            notificationTitle = "🧹 Hausarbeit geändert";
            notificationBody = assignedNames.length > 0
              ? `${authorName} hat "${record?.title || "Aufgabe"}" für ${assignedNames.join(", ")} bearbeitet.`
              : `${authorName} hat "${record?.title || "Aufgabe"}" bearbeitet.`;
          } else if (type === "DELETE") {
            notificationTitle = "🧹❌ Hausarbeit gelöscht";
            notificationBody = assignedNames.length > 0
              ? `${authorName} hat "${oldRecord?.title || "Aufgabe"}" für ${assignedNames.join(", ")} gelöscht.`
              : `${authorName} hat "${oldRecord?.title || "Aufgabe"}" gelöscht.`;
          } else if (type !== "INSERT") {
            return new Response("Skipped task update", { status: 200, headers: { "Access-Control-Allow-Origin": "*" } });
          } else {
            notificationTitle = "🧹 Neue Hausarbeit";
            notificationBody = assignedNames.length > 0
              ? `${authorName} hat "${record?.title || "Aufgabe"}" für ${assignedNames.join(", ")} erstellt.`
              : `${authorName} hat "${record?.title || "Aufgabe"}" erstellt.`;
          }
          break;
        case "personal_tasks":
          if (type === "DELETE") {
            notificationTitle = "✅❌ Aufgabe gelöscht";
            notificationBody = `${authorName} hat "${oldRecord?.title || "Aufgabe"}" gelöscht.`;
          } else if (type !== "INSERT") {
            return new Response("Skipped task update", { status: 200, headers: { "Access-Control-Allow-Origin": "*" } });
          } else {
            notificationTitle = "✅ Neue Aufgabe";
            notificationBody = `${authorName} hat "${record?.title || "Aufgabe"}" erstellt.`;
          }
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
        case "meal_requests": {
          const dish = record?.dish_name || record?.dishName || oldRecord?.dish_name || oldRecord?.dishName || "Gericht";
          if (type === "DELETE") {
            notificationTitle = "🍽️❌ Essenswunsch entfernt";
            notificationBody = `${authorName} hat den Wunsch "${dish}" entfernt.`;
          } else if (type === "UPDATE") {
            notificationTitle = "🍽️🔁 Essenswunsch geändert";
            notificationBody = `${authorName} hat den Wunsch "${dish}" bearbeitet.`;
          } else if (type !== "INSERT") {
            return new Response("Skipped meal request update", { status: 200, headers: { "Access-Control-Allow-Origin": "*" } });
          } else {
            notificationTitle = "🍽️ Essenswunsch";
            notificationBody = `${authorName} wünscht sich "${dish}".`;
          }
          break;
        }
        case "meal_plan": {
          const mealSlot = record?.meal_name || record?.mealName || record?.breakfast || record?.lunch || "";
          const day = formatDate(record?.day || oldRecord?.day);
          if (type === "DELETE") {
            notificationTitle = "🍽️❌ Mahlzeit entfernt";
            notificationBody = mealSlot
              ? `${authorName} hat "${mealSlot}" am ${day} aus dem Speiseplan entfernt.`
              : `${authorName} hat eine Mahlzeit am ${day} aus dem Speiseplan entfernt.`;
          } else if (type === "UPDATE") {
            notificationTitle = "🍽️🔁 Speiseplan geändert";
            notificationBody = mealSlot
              ? `${authorName} hat "${mealSlot}" am ${day} geändert.`
              : `${authorName} hat den Speiseplan am ${day} geändert.`;
          } else if (type !== "INSERT") {
            return new Response("Skipped meal plan update", { status: 200, headers: { "Access-Control-Allow-Origin": "*" } });
          } else {
            notificationTitle = "🍽️ Neue Mahlzeit";
            notificationBody = mealSlot
              ? `${authorName} hat "${mealSlot}" am ${day} zum Speiseplan hinzugefügt.`
              : `${authorName} hat eine Mahlzeit am ${day} zum Speiseplan hinzugefügt.`;
          }
          break;
        }
        case "app_settings":
          if (type !== "UPDATE") return new Response("Skipped settings update", { status: 200, headers: { "Access-Control-Allow-Origin": "*" } });
          if (record?.push_test_at && record?.push_test_at !== oldRecord?.push_test_at) {
            notificationTitle = record?.push_test_title || "🔔 Push-Test";
            notificationBody = record?.push_test_message || "Das ist eine Test-Benachrichtigung von FamilyHub.";
            break;
          }
          if (record?.maintenance_mode === true && oldRecord?.maintenance_mode !== true) {
            notificationTitle = "🔧 Wartungsmodus aktiv";
            notificationBody = "FamilyHub ist kurz offline. Wir sind gleich wieder für dich da.";
          } else if (record?.maintenance_mode === false && oldRecord?.maintenance_mode === true) {
            notificationTitle = "✅ Wartung beendet";
            notificationBody = "FamilyHub ist wieder online. Bitte App auf mögliche Updates prüfen";
          } else {
            return new Response("Skipped settings update", { status: 200, headers: { "Access-Control-Allow-Origin": "*" } });
          }
          break;
        default:
          return new Response("Unknown table", { status: 200, headers: { "Access-Control-Allow-Origin": "*" } });
      }
    }

    // Auto-exclude the author (who triggered the change) from push recipients, so they don't get double notifications
    const authorExcludeId = record?.author_id || record?.authorId || record?.requested_by || record?.requestedBy || record?.user_id || record?.userId;
    const effectiveExcludeUserId = excludeUserId || (authorExcludeId !== "" && authorExcludeId !== undefined ? authorExcludeId as string : undefined);
    const tokens = await collectRecipientTokens(supabase, effectiveExcludeUserId, table);
    if (tokens.length === 0) {
      console.log("No target tokens found — users may need to (re)login to register their FCM token");
      return new Response(JSON.stringify({ success: true, message: "No tokens to notify" }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    console.log(`Found ${tokens.length} recipient token(s):`, tokens.map((t: string) => t.substring(0, 20) + "..."));

    const tableName = table || "broadcast";
    const entityId = record?.id || record?.dish_name || "";
    const notificationData = {
      click_action: "FLUTTER_NOTIFICATION_CLICK",
      table: tableName,
      type: type || "manual",
      route: TABLE_ROUTE_MAP[tableName] || "dashboard",
      ...(entityId ? { entityId } : {}),
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
          console.log(`[push-notify] Removing stale token: ${token.substring(0, 20)}...`);
          // Remove from fcm_tokens table
          await supabase.from("fcm_tokens").delete().eq("token", token);
          // Also clear from family row (fallback source)
          await supabase.from("family").update({ fcm_token: null }).eq("fcm_token", token);
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
