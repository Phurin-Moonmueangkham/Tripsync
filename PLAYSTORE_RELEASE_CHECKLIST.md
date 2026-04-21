# TripSync Google Play Release Checklist

Use this checklist before every production release.

## A) Build and quality gate (must pass)

Run in project root:

```bash
npm ci
npx expo-doctor
npx tsc --noEmit
npm audit
```

Expected:

- `expo-doctor`: all checks passed
- `tsc`: no errors
- `npm audit`: `found 0 vulnerabilities`

## B) Android app versioning

Update in `app.json` before each new store upload:

- `expo.version`: user-visible app version (e.g. `1.0.1`)
- `expo.android.versionCode`: increment by 1 every upload

Rule:

- Google Play rejects uploads when `versionCode` is not higher than the previous release.

## C) Build AAB for Google Play

Use EAS production profile:

```bash
npx eas build -p android --profile production
```

Then download the generated `.aab` file from EAS.

## D) Required Play Console setup

In Play Console, verify these are complete:

- App access (if login required, provide demo credentials/instructions)
- Content rating questionnaire
- Ads declaration
- Data safety form
- Privacy policy URL
- Target audience + content

## E) Permissions and policy alignment

Current TripSync runtime behavior:

- Foreground location for map and trip tracking
- Firebase authentication and Firestore trip data

Before release, ensure:

- Permission prompt text clearly explains why location is needed
- Data Safety answers match actual data usage
- Privacy policy explicitly mentions location + account data handling

## F) Release validation on real device

Smoke-test on at least one physical Android device:

- Sign up / sign in
- Create trip
- Join trip with code
- Live location updates
- SOS on/off
- Meeting point set/clear by owner
- Destination reached / meeting reached markers
- Leave trip

## G) Rollout strategy

Recommended first production rollout:

- Start with `20%` staged rollout
- Monitor crash-free users and ANR in Android Vitals
- Expand rollout to 100% after stability checks

## H) Emergency rollback prep

Before publishing, prepare:

- Previous stable release retained in Play Console
- Quick rollback decision rule (crash spike / severe backend issue)
- On-call owner for first 24 hours after rollout
