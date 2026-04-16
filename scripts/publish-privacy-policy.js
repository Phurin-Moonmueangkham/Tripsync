const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const sourceFile = path.join(projectRoot, 'legal', 'privacy-policy.html');
const distDir = path.join(projectRoot, 'dist');
const targetDir = path.join(distDir, 'privacy-policy');
const targetFile = path.join(targetDir, 'index.html');

if (!fs.existsSync(distDir)) {
  console.error('dist directory not found. Run web build first.');
  process.exit(1);
}

if (!fs.existsSync(sourceFile)) {
  console.error('privacy policy source file not found:', sourceFile);
  process.exit(1);
}

fs.mkdirSync(targetDir, { recursive: true });
fs.copyFileSync(sourceFile, targetFile);

console.log('Privacy Policy published to:', targetFile);
