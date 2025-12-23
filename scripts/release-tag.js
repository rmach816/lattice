#!/usr/bin/env node

const { readFileSync } = require('fs');
const { join } = require('path');
const { execSync } = require('child_process');

const rootDir = join(__dirname, '..');
const packageJsonPath = join(rootDir, 'package.json');

// Check if we're in a git repository
try {
  execSync('git rev-parse --is-inside-work-tree', { stdio: 'pipe', cwd: rootDir });
} catch (error) {
  console.error('Error: not in a git repository');
  process.exit(1);
}

try {
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  const version = packageJson.version;

  if (!version) {
    console.error('Error: version not found in package.json');
    process.exit(1);
  }

  const tagName = `v${version}`;

  // Check if tag already exists
  try {
    execSync(`git rev-parse --verify "${tagName}"`, { stdio: 'pipe', cwd: rootDir });
    console.error(`Error: tag ${tagName} already exists`);
    process.exit(1);
  } catch (error) {
    // Tag doesn't exist, which is what we want
  }

  // Create annotated tag
  try {
    execSync(`git tag -a "${tagName}" -m "Release ${tagName}"`, { stdio: 'inherit', cwd: rootDir });
    console.log(`Created tag: ${tagName}`);
  } catch (error) {
    console.error(`Error: failed to create tag ${tagName}`);
    process.exit(1);
  }
} catch (error) {
  if (error.code === 'ENOENT') {
    console.error('Error: package.json not found');
  } else {
    console.error(`Error: ${error.message}`);
  }
  process.exit(1);
}

