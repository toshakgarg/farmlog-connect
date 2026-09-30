# FarmLog Connect v1.0.0

Agricultural field data collection app for JOITA Bioseed AI.

## Tech Stack
- React + TanStack Router + Vite + TypeScript
- Azure Cosmos DB (database)
- Azure Blob Storage (photos)
- Azure Computer Vision (form scanning)
- JWT authentication (email/password)
- Expo WebView (Android APK)
- Vercel (hosting)

## Roles
- Admin — manages users, views all records, exports data
- Supervisor — creates farmer records, fills JOITA forms, scans paper forms
- Farmer — views own profile and survey answers

## Features
- Bilingual UI (Hindi + English)
- Offline-first with auto-sync
- Geotagged field photos
- JOITA CCF-F01 digital form
- AI-powered paper form scanner

## Scripts
- `npm run dev` — local development
- `npm run build` — production build
- `node scripts/setup-cosmos.cjs` — initialize Azure DB
- `node scripts/seed-admin.cjs` — create admin account

## Environment Variables
See `.env.example` for required variables.