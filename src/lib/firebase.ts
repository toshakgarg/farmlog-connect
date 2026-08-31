import { initializeApp, getApps, getApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const env = import.meta.env as Record<string, string | undefined>;

// Defaults from the farmlog-connect project; environment variables override.
// The Firebase apiKey is a public client key (not a secret) — set VITE_FIREBASE_API_KEY.
export const firebaseConfig: FirebaseOptions = {
  apiKey: env["VITE_FIREBASE_API_KEY"] ?? "",
  authDomain: env["VITE_FIREBASE_AUTH_DOMAIN"] ?? "farmlog-connect.firebaseapp.com",
  projectId: env["VITE_FIREBASE_PROJECT_ID"] ?? "farmlog-connect",
  storageBucket: env["VITE_FIREBASE_STORAGE_BUCKET"] ?? "farmlog-connect.firebasestorage.app",
  messagingSenderId: env["VITE_FIREBASE_MESSAGING_SENDER_ID"] ?? "1053936524676",
  appId: env["VITE_FIREBASE_APP_ID"] ?? "1:1053936524676:web:aca17a46604fb626a891d1",
};



export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
}

export function getFirebaseApp(name = "[DEFAULT]"): FirebaseApp {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase environment variables are missing.");
  }
  const existing = getApps().find((a) => a.name === name);
  if (existing) return existing;
  return name === "[DEFAULT]"
    ? initializeApp(firebaseConfig)
    : initializeApp(firebaseConfig, name);
}

export const fbAuth = (): Auth => getAuth(getFirebaseApp());
export const fbDb = (): Firestore => getFirestore(getFirebaseApp());
export const fbStorage = (): FirebaseStorage => getStorage(getFirebaseApp());

/** Secondary app so an admin can create accounts without losing their own session. */
export function secondaryAuth(): Auth {
  const app = getApps().find((a) => a.name === "farmlog-secondary") ?? getFirebaseApp("farmlog-secondary");
  return getAuth(app);
}

export { getApp };
