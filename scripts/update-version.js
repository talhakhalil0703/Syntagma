import fs from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const packageJsonPath = path.join(rootDir, 'package.json');
const srcVersionPath = path.join(rootDir, 'src', 'version.ts');

try {
  // 1. Increment version in package.json and package-lock.json
  // We use --no-git-tag-version to avoid creating a tag, as we only want to update the files.
  execSync('npm version patch --no-git-tag-version', { cwd: rootDir });
  
  // 2. Read the new version from package.json
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const newVersion = pkg.version;
  
  // 3. Update src/version.ts
  const versionTsContent = `export const APP_VERSION = '${newVersion}';\n`;
  fs.writeFileSync(srcVersionPath, versionTsContent);
  
  console.log(`Updated version to ${newVersion}`);
} catch (error) {
  console.error('Failed to update version:', error);
  process.exit(1);
}
