const requiredKeys = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
];

const optionalKeys = ['EXPO_PUBLIC_GOOGLE_MAPS_API_KEY'];

const missingRequired = requiredKeys.filter((key) => !process.env[key]);

if (missingRequired.length > 0) {
  console.error('\n❌ Missing required environment variables for web build:');
  missingRequired.forEach((key) => {
    console.error(`- ${key}`);
  });
  console.error('\nCreate a .env file (or export variables in shell) before running build/deploy.\n');
  process.exit(1);
}

const missingOptional = optionalKeys.filter((key) => !process.env[key]);
if (missingOptional.length > 0) {
  console.warn('\n⚠️ Optional env vars not set:');
  missingOptional.forEach((key) => {
    console.warn(`- ${key}`);
  });
  console.warn('Maps search/routing features may fail without these values.\n');
}

console.log('✅ Environment check passed.');
