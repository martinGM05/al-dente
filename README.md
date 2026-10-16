# Al dente

Al dente is a mobile-first meal planner for organizing a weekly menu, keeping recipes, and generating a focused shopping list. It uses Google sign-in and stores each user's plan privately in Firebase.

## Quick start

```sh
pnpm install
pnpm dev
```

Open the local URL printed by Vite. To use authentication and data persistence, create `.env` with the Firebase values below before signing in.

## Configure Firebase

Set these public values in `.env`:

```dotenv
PUBLIC_FIREBASE_API_KEY=
PUBLIC_FIREBASE_AUTH_DOMAIN=
PUBLIC_FIREBASE_PROJECT_ID=
PUBLIC_FIREBASE_APP_ID=
```

Then, in Firebase:

1. Enable **Google** as an Authentication provider.
2. Create a Firestore database.
3. Deploy the access rules in `firestore.rules` using your Firebase deployment workflow.

The rules allow users to read and write only their own plan at `users/{userId}/mealPlans/current`.

## What the app does

- Plan breakfast, lunch, and dinner for each day of the week.
- Create recipes with ingredients and one preparation step per line.
- Read recipe details in a mobile bottom sheet and add recipes to the current day.
- Build a grouped shopping list from selected planned meals.
- Keep the session locally with Firebase Authentication.
- Provide a mobile-first navigation and an installable PWA application shell.

## PWA behavior

The application includes a web manifest, install icons, and a SvelteKit service worker. After a successful online visit, the app shell and static assets are cached so the interface can open without a connection.

Firebase remains online-only: this project does not promise offline edits or later data synchronization.

## Commands

| Command        | Purpose                                                  |
| -------------- | -------------------------------------------------------- |
| `pnpm dev`     | Start the Vite development server.                       |
| `pnpm check`   | Run Svelte type and template diagnostics.                |
| `pnpm test`    | Run the unit test suite.                                 |
| `pnpm lint`    | Check formatting and lint rules.                         |
| `pnpm build`   | Create a production build, including the service worker. |
| `pnpm preview` | Serve the production build locally.                      |

## Verify the PWA

1. Serve a production build from `localhost` or HTTPS.
2. Open browser DevTools and confirm that the manifest and service worker are registered.
3. Install the app from the browser UI.
4. Enable offline mode in DevTools and reload. The app shell should open; Firebase data actions require a connection.

## Project structure

```text
src/routes/             Application routes and layout metadata
src/lib/components/     Authentication and account UI components
src/service-worker/     SvelteKit PWA caching worker
static/                 Manifest and application icons
firestore.rules         Per-user Firestore authorization rules
```
