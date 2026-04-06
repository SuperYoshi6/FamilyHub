# FamilyHub

A React + Vite family management web app (PWA) with Tailwind CSS, Supabase, and Firebase integration.

## Architecture

- **Frontend**: React 18 + TypeScript + Vite 6
- **Styling**: Tailwind CSS (loaded via CDN in index.html)
- **Backend/DB**: Supabase (PostgreSQL) + Firebase
- **AI**: Google Gemini API (`@google/genai`)
- **Mobile**: Capacitor (Android), Tauri (desktop)

## Project Layout

```
/
├── App.tsx              # Main app component (large, contains most routing/logic)
├── index.tsx            # React entry point
├── index.html           # HTML shell with Tailwind CDN
├── vite.config.ts       # Vite config (port 5000, host 0.0.0.0)
├── components/          # Shared UI components
├── pages/               # Page-level components
├── services/            # API/service integrations
├── types.ts             # Shared TypeScript types
├── Header.tsx           # App header component
├── NotificationContext.tsx # Notification context provider
├── public/              # Static assets (manifest.json for PWA)
├── android/             # Capacitor Android project
├── src-tauri/           # Tauri desktop config
└── supabase_schema.sql  # Supabase DB schema
```

## Running the App

```bash
npm run dev   # Start dev server on port 5000
npm run build # Build for production (outputs to dist/)
```

## Environment Variables

- `GEMINI_API_KEY` — Google Gemini AI API key (used for AI features)
- Supabase URL/key — configured in the services layer

## Deployment

Configured as a static site deployment:
- Build command: `npm run build`
- Public directory: `dist`
