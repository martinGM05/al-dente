import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { PUBLIC_FIREBASE_API_KEY, PUBLIC_FIREBASE_AUTH_DOMAIN, PUBLIC_FIREBASE_PROJECT_ID, PUBLIC_FIREBASE_APP_ID } from '$app/env/public';

export const firebaseConfigured = Boolean(PUBLIC_FIREBASE_API_KEY && PUBLIC_FIREBASE_AUTH_DOMAIN && PUBLIC_FIREBASE_PROJECT_ID && PUBLIC_FIREBASE_APP_ID);
const app = firebaseConfigured ? (getApps().length ? getApp() : initializeApp({ apiKey: PUBLIC_FIREBASE_API_KEY, authDomain: PUBLIC_FIREBASE_AUTH_DOMAIN, projectId: PUBLIC_FIREBASE_PROJECT_ID, appId: PUBLIC_FIREBASE_APP_ID })) : undefined;
export const auth = app ? getAuth(app) : undefined;
export const db = app ? getFirestore(app) : undefined;
