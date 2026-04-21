# TripSync Android First Release Guide

Use this for the first Google Play release and for every later production upload.

## 1) Preflight checks

Run these from the project root:

```bash
npm ci
npx expo-doctor
npx tsc --noEmit
npm audit
```

All four should pass before you build a production artifact.

## 2) Confirm release metadata

Check `app.json` before every upload:

- `expo.android.package` must stay stable forever once published.
- `expo.android.versionCode` must increase on every new upload.
- `expo.version` should be bumped for user-facing release notes.

Current Android package:

- `com.phurinm.tripsync`

## 3) Build an Android App Bundle

Use the EAS production profile:

```bash
npx eas build -p android --profile production
```

Output you want:

- a signed `.aab` file
- no build warnings about missing environment variables
- no dependency or config errors during prebuild

## 4) Upload to Play Console

In Google Play Console:

- create the app with the same package name
- upload the `.aab` to an internal or closed testing track first
- verify signing is handled by Play App Signing
- wait for processing to complete before promoting to production

## 5) First-release smoke test

Test on a real Android device with the installed bundle:

- sign up
- sign in
- create a trip
- join a trip with code
- allow location permission
- confirm live tracking updates
- toggle SOS on/off
- set and clear meeting point as owner
- leave trip
- sign out

## 6) Play Console items to finish before public release

- Data safety form
- Privacy policy URL
- Content rating questionnaire
- App access instructions if login is required
- Target audience declaration
- Ads declaration if applicable

## 7) Rollout recommendation

For the first production rollout:

- start at `10%` to `20%`
- watch Android Vitals for crashes and ANRs
- expand only after a stable period
