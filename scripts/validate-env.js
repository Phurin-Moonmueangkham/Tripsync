const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');

  envContent.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }

    const separatorIndex = trimmed.indexOf('=');

    if (separatorIndex <= 0) {
      return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
}

const requiredKeys = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
];

const optionalKeys = [
];

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
  console.warn('Some optional features may fail without these values.\n');
}

console.log('✅ Environment check passed.');
