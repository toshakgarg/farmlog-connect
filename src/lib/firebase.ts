import { initializeApp, getApps, getApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

export const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
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
