# Supabase Storage: APK-Upload Anleitung

Damit deine Android-App zum Download verfügbar ist, folge diesen Schritten, um die `FamilyHub.apk` in deinen Supabase-Storage hochzuladen.

## 1. Bucket erstellen oder öffnen
1.  **Supabase Dashboard öffnen**: Gehe zu deinem Projekt auf [supabase.com](https://supabase.com).
2.  **Storage**: Klicke auf das **Storage-Icon** (Eimer-Symbol) in der linken Seitenleiste.
3.  **Neuer Bucket**: Falls noch nicht vorhanden, klicke auf **"New Bucket"**.
4.  **Name `apps`**: Nenne den Bucket `apps` (alles kleingeschrieben).
5.  **Öffentlich setzen**: **WICHTIG!** Aktiviere den Schalter für **"Public"**. Wenn der Bucket privat ist, können Benutzer die APK nicht ohne speziellen Link herunterladen.

## 2. Datei hochladen
1.  Klicke auf deinen neuen `apps` Bucket.
2.  Klicke auf **"Upload File"** oder ziehe deine `FamilyHub.apk` per Drag & Drop hinein.
3.  **Dateiname prüfen**: Achte darauf, dass die Datei exakt `FamilyHub.apk` heißt (Groß-/Kleinschreibung beachten).

## 3. URL überprüfen
Nach dem Upload ist deine Datei unter folgendem Link erreichbar:
`https://hjkmfodzhradtkeiyele.supabase.co/storage/v1/object/public/apps/FamilyHub.apk`

Die LandingPage ist bereits so konfiguriert, dass sie genau auf diesen Link verweist.

## 4. Swift-Package für iOS (Playground)
Du kannst auch dein Swift-Package (`FamilyHub.swift`) in denselben Bucket laden.
- Lade die Datei einfach hoch.
- Der Link auf der Webseite (`.../apps/FamilyHub.swift`) funktioniert dann sofort genauso wie bei der APK.

---

### Tipps für Android-Nutzer
- **Chrome empfohlen**: Rate den Nutzern, Google Chrome für den Download zu verwenden. Interne Browser (wie in WhatsApp oder Instagram) blockieren oft APK-Downloads oder die Installation.
- **Unbekannte Quellen**: Beim ersten Öffnen der APK müssen Nutzer eventuell in den Android-Einstellungen die "Installation aus unbekannten Quellen" zulassen.
