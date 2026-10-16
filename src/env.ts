import { defineEnvVars } from '@sveltejs/kit/env';

// Firebase web config is intentionally public. Access is protected by Firebase Auth + Firestore rules.
export const variables = defineEnvVars({
	PUBLIC_FIREBASE_API_KEY: { public: true, static: true, schema: (value) => value ?? '' },
	PUBLIC_FIREBASE_AUTH_DOMAIN: { public: true, static: true, schema: (value) => value ?? '' },
	PUBLIC_FIREBASE_PROJECT_ID: { public: true, static: true, schema: (value) => value ?? '' },
	PUBLIC_FIREBASE_APP_ID: { public: true, static: true, schema: (value) => value ?? '' }
});
