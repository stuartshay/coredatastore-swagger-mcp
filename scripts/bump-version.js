#!/usr/bin/env node

/**
 * Version bumping script for semantic versioning
 * Usage: node scripts/bump-version.js [major|minor|patch]
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// Get the directory name
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageJsonPath = path.join(__dirname, '..', 'package.json');

// Read the current package.json
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const currentVersion = packageJson.version;

// Parse the version into components
const [major, minor, patch] = currentVersion.split('.').map(Number);

// Determine the type of bump from command line arguments
const bumpType = process.argv[2] || 'patch';

let newVersion;
switch (bumpType.toLowerCase()) {
  case 'major':
    newVersion = `${major + 1}.0.0`;
    break;
  case 'minor':
    newVersion = `${major}.${minor + 1}.0`;
    break;
  case 'patch':
  default:
    newVersion = `${major}.${minor}.${patch + 1}`;
    break;
}

// Update package.json
packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

console.warn(`Version bumped from ${currentVersion} to ${newVersion}`);

// Create a version commit
try {
  execSync('git add package.json');
  execSync(`git commit -m "chore: bump version to ${newVersion}"`);
  console.warn(`Commit created for version ${newVersion}`);
} catch (error) {
  console.error('Error creating git commit:', error.message);
}

// Suggest creating a tag
console.warn(`
To create a tag for this version:
  git tag -a v${newVersion} -m "Version ${newVersion}"
  git push origin v${newVersion}
`);
