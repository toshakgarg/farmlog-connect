# Contributing to FarmLog Connect

## Workflow

1. Create a focused branch from `main`.
2. Keep changes scoped to one feature or fix.
3. Do not commit `.env`, Firebase credentials, build output, or local investigation files.
4. Update the README or architecture notes when behavior or setup changes.

## Before Opening a Pull Request

Run:

```bash
npm ci
npm run check
```

Run `npm run lint` when changing TypeScript or React code. For UI, camera, GPS, authentication, or offline-sync changes, include the browser/device and online/offline conditions you verified.

## Firebase Changes

Review both `firestore.rules` and `storage.rules` when changing data access or photo upload behavior. Never place Firebase private keys or service-account credentials in the client or repository.