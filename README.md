# FarmLog Connect

Build a full-stack field data collection app called "FarmLog" for agricultural surveys in India.

Tech Stack: React (frontend), Firebase (Firestore database, Firebase Storage for photos, Firebase Authentication), bilingual UI (English + Hindi toggle).

USER ROLES — 3 separate login flows:

Admin — Master account. Can manage everything.

Supervisor — Field worker. Collects farmer data on-site.

Farmer — Can view and partially fill their own profile.

ADMIN PANEL features:

Dashboard showing total farmers, total killahs, pending syncs, recent submissions

Create / edit / delete Supervisor accounts

Create / edit / delete Farmer accounts

Manage Survey Questions: add a question, set its answer type (Category with options / Numerical / Short Text), mark it required or optional, reorder questions

View all farmer records with filters (by village, supervisor, land size, date)

View individual farmer full profile with all photos

Export all data as CSV

FARMER RECORD schema (Firestore):

Lead Farmer fields:

Full name, age, gender, contact number

Village, tehsil, district, state

Number of killahs (land size)

Is this a Lead Farmer? (yes/no) — if yes, link sub-farmers to them

Assigned Supervisor ID

Survey answers (dynamic — stored as key-value pairs matching admin-defined questions)

Photos array: each photo has { url, latitude, longitude, timestamp }

Record status: Draft / Submitted / Synced

Created at, Updated at

Sub-farmer fields: same schema, with an additional leadFarmerID reference field.

SUPERVISOR APP features:

Login → see only their assigned farmers

Create new farmer record (Lead or Sub)

Fill farmer details form (all fields above)

Answer dynamic survey questions fetched from Firestore (admin-defined)

In-app camera: capture photo directly inside the app using device camera API — do NOT ask user to upload from gallery. Auto-stamp GPS coordinates (latitude, longitude) and timestamp on each photo at capture time using browser Geolocation API. Allow multiple photos per farmer. Minimum 1 photo required before submission.

Save record as Draft (stored locally if offline, synced when online)

Submit record when complete

Offline support: use localStorage or IndexedDB to queue records and photos when there is no internet. Auto-sync in background when connection is restored. Show sync status (Pending / Synced) per record.

FARMER LOGIN features:

View their own profile and submitted answers

Answer or update optional survey questions themselves

Cannot create records or view other farmers

BILINGUAL UI:

Toggle between English and Hindi throughout the app

All labels, buttons, form fields, and status messages should have both language versions

Default language: Hindi

IMPORTANT technical requirements:

Mobile-first responsive design (this app will be used on Android phones in fields)

Camera must open inside the app — no redirect to another app

GPS must be captured at the moment of photo click, not after

The app must function offline for data entry and photo capture; sync happens automatically when internet is available

Firebase config will be connected after generation — leave Firebase config as environment variables (VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_STORAGE_BUCKET, VITE_FIREBASE_APP_ID, VITE_FIREBASE_MESSAGING_SENDER_ID, VITE_FIREBASE_AUTH_DOMAIN)

Use clean, simple UI — this will be used by people who may not be tech-savvy

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/616cfe9c-9027-4f40-a00e-34990d74a255).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
