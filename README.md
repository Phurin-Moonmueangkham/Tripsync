# TripSync Setup

## 1) Install dependencies

```bash
npm install
npx expo install react-native-maps@1.20.1 react-native-screens@4.16.0
npx expo install react-dom react-native-web @expo/metro-runtime
npm install zustand firebase @react-native-async-storage/async-storage
npx expo install expo-location
```

## 2) Firebase setup

1. Create project in Firebase Console
2. Enable `Authentication > Sign-in method > Email/Password`
3. Create Firestore Database
4. Add a Web App and copy Firebase config values

## 3) Google Maps API setup (for map destination + route)

1. Open Google Cloud Console for the same Firebase project
2. Enable APIs:
   - `Geocoding API`
   - `Directions API`
   - (Optional) `Maps JavaScript API`
3. Create API key and restrict it later for security

## 4) Environment variables

```bash
cp .env.example .env
```

Set values in `.env`:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=...
```

## 5) Run in Expo Go

```bash
npx expo start --tunnel
```

## 6) Feature flow implemented

- Create Trip: set trip name + pin destination on map + create shared route from Google Directions
- Join Trip: enter trip code and open shared map dashboard
- Shared Map: all members see same destination and route, plus live member markers
- Tracking Modes:
  - `High Accuracy`: near real-time GPS updates
  - `Balanced`: periodic updates
  - `Smart`: interval-based GPS polling (auto on/off style)
