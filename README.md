# TripSync Setup

## 1) Install dependencies

```bash
npm install
```

## 2) Environment variables

Create `.env` in project root:

Required keys:

```bash
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=...
```

`EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` is required for Android native map screens (`react-native-maps`).

For Android builds, Expo reads this from `app.config.js` and injects it into `android.config.googleMaps.apiKey`.
If you use EAS, add the same variable as an environment secret named `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` in the `preview` and `production` environments.

## 3) Run in development

### Mobile (Expo Go)

```bash
npm run start:tunnel
```

If you prefer calling Expo directly, use:

```bash
npx expo start --tunnel
```

Download **Expo Go** on your phone, connect to the same network, then scan the QR code.

### Web

```bash
npm run web
```

## 4) Build web app (production export)

```bash
npx expo export --platform web
```

Output is generated in `dist/`.

## 5) Deploy web app

You can deploy the `dist/` folder to any static hosting platform:

- Vercel
- Netlify
- Firebase Hosting

For Firebase Hosting (configured for this repo):

```bash
npx firebase-tools login
npm run deploy:firebase
```

Firebase project id in this repo: `tripsync-1d80c`.

## Map services (free stack)

TripSync now uses free OpenStreetMap-based public services:

- Map preview/embed: OpenStreetMap
- Web interactive map renderer: MapLibre GL JS
- Search & reverse geocoding: Nominatim
- Routing: OSRM demo server

Important limits:

- Public free endpoints are rate-limited and not guaranteed for high-traffic production.
- For heavy usage, switch to self-hosted services or paid managed providers.

## Notes for web mode

- Native `react-native-maps` is replaced by web-compatible screens.
- Place search, location access, and trip creation still work on web.
- Browser location works best on `https` or `localhost`.

## CI/CD (Auto deploy to Firebase on push)

This repo includes GitHub Actions workflow:

- [.github/workflows/firebase-hosting-deploy.yml](.github/workflows/firebase-hosting-deploy.yml)

It auto builds and deploys to Firebase Hosting when you push to `main`.

### Required GitHub Secrets

In GitHub repo settings > Secrets and variables > Actions, add:

- `FIREBASE_TOKEN`
- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`

### Generate FIREBASE_TOKEN

Run locally:

```bash
npx firebase-tools login:ci
```

Copy the generated token and save it as `FIREBASE_TOKEN` secret.

## Android release checklist

For Google Play releases, follow:

- [PLAYSTORE_RELEASE_CHECKLIST.md](PLAYSTORE_RELEASE_CHECKLIST.md)
- [EAS_ANDROID_FIRST_RELEASE.md](EAS_ANDROID_FIRST_RELEASE.md)
- [PRIVACY_AND_DATA_SAFETY_DRAFT.md](PRIVACY_AND_DATA_SAFETY_DRAFT.md)