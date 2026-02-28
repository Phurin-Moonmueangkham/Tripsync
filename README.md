# TripSync Setup

## 1) Install dependencies

```bash
npm install
```

## 2) Environment variables

Create `.env` in project root (you can copy from `.env.example`):

```bash
cp .env.example .env
```

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

## 3) Run in development

### Mobile (Expo Go)

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
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`

### Generate FIREBASE_TOKEN

Run locally:

```bash
npx firebase-tools login:ci
```

Copy the generated token and save it as `FIREBASE_TOKEN` secret.