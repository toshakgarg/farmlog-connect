# Architecture Notes

## Application Boundaries

- `src/routes/` owns page-level routing and role-specific screens.
- `src/components/` owns user-facing feature flows and shared controls.
- `src/lib/types.ts` is the domain contract for farmers, surveys, photos, and sync records.
- `src/lib/firebase.ts` owns Firebase initialization and service access.
- `src/lib/offline.ts` owns IndexedDB persistence for records and photo blobs.
- `src/lib/data.ts` coordinates reads, writes, and synchronization between the UI and Firebase.

## Data Flow

1. A route loads the current user and records through the data and auth modules.
2. Forms update a local record and can save it to the offline store immediately.
3. The online state hook triggers synchronization when connectivity returns.
4. Firebase remains the shared backend; IndexedDB is the local working queue.

## Change Guidance

Keep domain types and persistence behavior in `src/lib/`. Keep route modules thin and put reusable form behavior in components. Any change involving photos, GPS, authentication, or synchronization should be tested both online and offline when possible.