# FarmLog

**FarmLog** is an agricultural field survey collection web application. It enables offline-first data entry for farmers, supervisors, and administrators, providing seamless data synchronization to a centralized Firebase database.

## Key Features

- **Offline-First Data Collection:** Submits survey records and photos offline, queuing them for automatic sync when internet connectivity is restored.
- **Role-Based Access Control:** Dedicated views for Farmers, Supervisors, and Administrators.
- **Dynamic Survey Engine:** Administrators can configure custom survey questions (text, numerical, categorical) that instantly sync to all field devices.
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

- `src/components/`: Reusable UI components (buttons, dialogs, inputs, camera tools).
- `src/routes/`: File-based page routes (`admin.tsx`, `farmer.tsx`, `supervisor.tsx`, etc.).
- `src/lib/`: Core utilities including Firebase initialization, data fetching, offline syncing logic, i18n, and types.
- `src/hooks/`: Custom React hooks (e.g., `useOnline`).
- `public/`: Static assets like icons and robots.txt.

## Prerequisites

- Node.js (v20 or higher recommended)
- npm
- A Firebase project with Authentication (Email/Password), Firestore, and Storage enabled.

## Local Installation

1. Clone the repository and install dependencies:

   ```bash
   npm install
   ```

2. Setup Environment Variables:
   Copy `.env.example` to `.env` and fill in your Firebase configuration values.

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

3. Start the Development Server:
   ```bash
   npm run dev
   ```

## Production Build

To build the application for production:

```bash
npm run build
```

This command generates the optimized static assets and server output in the `.output/` directory.

## Environment & Security Notes

- The `.env` file must never be committed to version control.
- Ensure Firestore and Storage security rules are properly configured in your Firebase Console (see `firestore.rules` and `storage.rules`).

## Current Status

- Production ready. Recent patches resolve runtime errors for missing relational records on the Admin dashboard.
