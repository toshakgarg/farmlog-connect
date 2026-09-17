# FarmLog Connect

FarmLog Connect is an offline-first agricultural field survey application for field teams, supervisors, and administrators. It captures farmer records, crop observations, GPS-tagged photos, and follow-up data, then synchronizes them with Firebase when connectivity is available.

## Key Features

- **Offline-First Data Collection:** Submits survey records and photos offline, queuing them for automatic sync when internet connectivity is restored.
- **Role-Based Access Control:** Dedicated views for Farmers, Supervisors, and Administrators.
- **Dynamic Survey Engine:** Administrators can configure custom survey questions that sync to field devices.
- **Photo & GPS Capture:** Integrated camera tools with embedded GPS geolocation tagging for field authenticity.
- **Bilingual Support:** Full English and Hindi interface toggle.
- **Admin Dashboard & CSV Export:** Comprehensive overview of all collected records, killahs (land size), pending syncs, and one-click CSV exporting.

## Technology Stack

- **Frontend Framework:** React 19 + TypeScript
- **Routing:** TanStack Router (File-based routing)
- **Styling:** Tailwind CSS v4 + Radix UI (shadcn/ui-inspired components)
- **Build Tool:** Vite + Nitro
- **Backend & Database:** Firebase (Authentication, Firestore, Storage)
- **Offline Storage:** IndexedDB (`idb` library)

## Project Structure

```text
src/
   components/  Feature components and reusable UI primitives
   hooks/       Browser and device hooks
   lib/         Firebase, offline storage, i18n, domain types, and utilities
   routes/      TanStack Router route modules
native/        Expo entry point for native builds
public/        Static web assets
assets/        Expo and web branding assets
firestore.rules
storage.rules
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the main data and offline-sync boundaries.

## Prerequisites

- Node.js (v20 or higher recommended)
- npm
- A Firebase project with Authentication (Email/Password), Firestore, and Storage enabled.

## Local Development

1. Clone the repository and install dependencies:

   ```bash
   npm install
   ```

2. Setup Environment Variables:
   Copy `.env.example` to `.env` and fill in your Firebase configuration values. Never commit `.env`.

   ```bash
   cp .env.example .env
   ```

   _Required Variables:_
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`

3. Start the web development server:
   ```bash
   npm run dev
   ```

4. Run the developer checks:
   ```bash
   npm run check
   ```

Use `npm run start` for the Expo development workflow and `npm run android` to launch the Android target.

## Production Build

To build the application for production:

```bash
npm run build
```

This command generates optimized static assets and server output in `.output/`.

## Environment & Security Notes

- The `.env` file must never be committed to version control.
- Ensure Firestore and Storage security rules are properly configured in your Firebase Console (see `firestore.rules` and `storage.rules`).

## Contributing

Before opening a pull request, run `npm run check` and describe any manual UI or offline-device verification. Review [CONTRIBUTING.md](CONTRIBUTING.md) for the expected workflow.
