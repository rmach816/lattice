#!/usr/bin/env node

import { promises as fs } from 'fs';
import { join, dirname, resolve, normalize, isAbsolute, sep } from 'path';
import { execSync } from 'child_process';
import { Renderer } from '@lattice/engine';
import { InMemoryPluginRegistry } from '@lattice/engine';
import { NextJsPlugin } from '@lattice/engine';
import { validateProjectConfig } from '@lattice/engine';
import { resolvePolicy } from '@lattice/engine';
import type { Manifest } from '@lattice/engine';

function validateFilePath(filePath: string): void {
  if (filePath.includes('..')) {
    throw new Error(`Path traversal detected: ${filePath}`);
  }
  if (isAbsolute(filePath)) {
    throw new Error(`Absolute path not allowed: ${filePath}`);
  }
}

async function writeFiles(
  files: Map<string, Buffer>,
  outputDir: string
): Promise<void> {
  const absOutputDir = normalize(resolve(outputDir));
  
  for (const [path, content] of files.entries()) {
    validateFilePath(path);
    
    const normalizedPath = normalize(path).replace(/\\/g, '/');
    const fullPath = normalize(resolve(absOutputDir, normalizedPath));
    
    if (!fullPath.startsWith(absOutputDir)) {
      throw new Error(`Path outside output directory: ${path}`);
    }
    
    const dir = dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, content);
  }
}

async function writeManifest(manifest: Manifest, outputDir: string): Promise<void> {
  const manifestPath = join(outputDir, '.lattice', 'manifest.json');
  await fs.mkdir(dirname(manifestPath), { recursive: true });
  await fs.writeFile(
    manifestPath,
    JSON.stringify(manifest, null, 2) + '\n',
    'utf-8'
  );
}

async function generate(outputDir: string, configPath?: string): Promise<void> {
  let config;
  if (configPath) {
    const configContent = await fs.readFile(configPath, 'utf-8');
    config = validateProjectConfig(JSON.parse(configContent));
  } else {
    // Try to use .lattice/config.json if it exists
    const defaultConfigPath = join(process.cwd(), '.lattice', 'config.json');
    try {
      const configContent = await fs.readFile(defaultConfigPath, 'utf-8');
      config = validateProjectConfig(JSON.parse(configContent));
    } catch {
      // Fall back to default config if .lattice/config.json doesn't exist
      config = validateProjectConfig({
        projectType: 'nextjs',
        strictnessPreset: 'startup',
      });
    }
  }

  const registry = new InMemoryPluginRegistry();
  registry.register(new NextJsPlugin());

  const policy = resolvePolicy(config);
  const renderer = new Renderer(registry);
  const result = renderer.render(config, policy);

  const absOutputDir = resolve(outputDir);
  await fs.mkdir(absOutputDir, { recursive: true });

  console.log(`Generating pack to ${absOutputDir}...`);
  await writeFiles(result.files, absOutputDir);
  await writeManifest(result.manifest, absOutputDir);

  console.log(`Generated ${result.files.size} files`);
  console.log(`Manifest written to ${join(absOutputDir, '.lattice', 'manifest.json')}`);
}

async function apply(packDir: string, targetDir: string): Promise<void> {
  const manifestPath = join(packDir, '.lattice', 'manifest.json');
  let manifest: Manifest;
  try {
    const manifestContent = await fs.readFile(manifestPath, 'utf-8');
    manifest = JSON.parse(manifestContent);
  } catch (error) {
    throw new Error(`Failed to read manifest: ${manifestPath}`);
  }

  const absPackDir = normalize(resolve(packDir));
  const absTargetDir = normalize(resolve(targetDir));
  await fs.mkdir(absTargetDir, { recursive: true });

  console.log(`Applying pack from ${absPackDir} to ${absTargetDir}...`);

  const conflicts: string[] = [];
  let added = 0;
  
  for (const file of manifest.files) {
    validateFilePath(file.path);
    
    const normalizedPath = normalize(file.path).replace(/\\/g, '/');
    const sourcePath = normalize(join(absPackDir, normalizedPath));
    const targetPath = normalize(resolve(absTargetDir, normalizedPath));
    
    if (!targetPath.startsWith(absTargetDir)) {
      throw new Error(`Path outside target directory: ${file.path}`);
    }

    try {
      await fs.access(targetPath);
      conflicts.push(file.path);
    } catch {
      const content = await fs.readFile(sourcePath);
      const dir = dirname(targetPath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(targetPath, content);
      added++;
    }
  }

  if (conflicts.length > 0) {
    console.error(`\nConflicts detected (files already exist):`);
    for (const path of conflicts) {
      console.error(`  - ${path}`);
    }
    console.error(`\nAdditive-only mode: skipping ${conflicts.length} conflicting files`);
  }

  console.log(`Applied ${added} files`);
  if (conflicts.length > 0) {
    console.log(`Skipped ${conflicts.length} conflicting files`);
  }
}

async function getLatticeVersion(): Promise<string> {
  try {
    // Try to find root package.json by going up from node_modules or current dir
    const currentDir = process.cwd();
    let packageJsonPath = join(currentDir, 'package.json');
    
    // If we're in a workspace, try to find the root
    let attempts = 0;
    while (attempts < 10) {
      try {
        const content = await fs.readFile(packageJsonPath, 'utf-8');
        const pkg = JSON.parse(content);
        if (pkg.name === 'lattice' || pkg.workspaces) {
          return pkg.version || '0.0.0';
        }
      } catch {
        // Continue searching
      }
      packageJsonPath = join(dirname(packageJsonPath), '..', 'package.json');
      attempts++;
    }
    
    // Fallback: try relative to CLI package
    try {
      const cliPackageJson = resolve(__dirname, '..', '..', '..', 'package.json');
      const content = await fs.readFile(cliPackageJson, 'utf-8');
      const pkg = JSON.parse(content);
      return pkg.version || '0.0.0';
    } catch {
      return '0.0.0';
    }
  } catch {
    return '0.0.0';
  }
}

async function init(
  projectType?: string,
  preset?: string,
  billing?: string,
  analytics?: string,
  observability?: string,
  testing?: string,
  force?: boolean
): Promise<void> {
  // Validate required flags
  if (!projectType) {
    throw new Error('--projectType is required. Must be "nextjs" or "expo-eas"');
  }
  if (!preset) {
    throw new Error('--preset is required. Must be "startup", "pro", or "enterprise"');
  }

  // Validate projectType
  if (projectType !== 'nextjs' && projectType !== 'expo-eas') {
    throw new Error(`Invalid --projectType: ${projectType}. Must be "nextjs" or "expo-eas"`);
  }

  // Validate preset
  if (preset !== 'startup' && preset !== 'pro' && preset !== 'enterprise') {
    throw new Error(`Invalid --preset: ${preset}. Must be "startup", "pro", or "enterprise"`);
  }

  // Validate optional flags if provided
  if (billing && billing !== 'none' && billing !== 'stripe' && billing !== 'revenuecat') {
    throw new Error(`Invalid --billing: ${billing}. Must be "none", "stripe", or "revenuecat"`);
  }
  if (analytics && analytics !== 'none' && analytics !== 'amplitude' && analytics !== 'mixpanel' && analytics !== 'posthog') {
    throw new Error(`Invalid --analytics: ${analytics}. Must be "none", "amplitude", "mixpanel", or "posthog"`);
  }
  if (observability && observability !== 'none' && observability !== 'sentry') {
    throw new Error(`Invalid --observability: ${observability}. Must be "none" or "sentry"`);
  }
  if (testing && testing !== 'none' && testing !== 'unit' && testing !== 'unit-e2e') {
    throw new Error(`Invalid --testing: ${testing}. Must be "none", "unit", or "unit-e2e"`);
  }

  // Build ProjectConfig object
  const config: any = {
    projectType: projectType as 'nextjs' | 'expo-eas',
    strictnessPreset: preset as 'startup' | 'pro' | 'enterprise',
  };

  if (billing) {
    config.billingProvider = billing as 'none' | 'stripe' | 'revenuecat';
  }
  if (analytics) {
    config.analyticsProvider = analytics as 'none' | 'amplitude' | 'mixpanel' | 'posthog';
  }
  if (observability) {
    config.observability = observability as 'none' | 'sentry';
  }
  if (testing) {
    config.testingLevel = testing as 'none' | 'unit' | 'unit-e2e';
  }

  // Validate using engine schema
  const validatedConfig = validateProjectConfig(config);

  // Check if config file already exists
  const configPath = join(process.cwd(), '.lattice', 'config.json');
  try {
    await fs.access(configPath);
    if (!force) {
      throw new Error(`Config file already exists: ${configPath}. Use --force to overwrite.`);
    }
  } catch (error: any) {
    if (error.code !== 'ENOENT' && !force) {
      throw error;
    }
  }

  // Create .lattice directory if missing
  const configDir = dirname(configPath);
  await fs.mkdir(configDir, { recursive: true });

  // Write config file
  await fs.writeFile(
    configPath,
    JSON.stringify(validatedConfig, null, 2) + '\n',
    'utf-8'
  );

  console.log(`✓ Created config file: ${configPath}`);
}

interface CheckResult {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
}

async function doctor(): Promise<void> {
  const checks: CheckResult[] = [];
  let hasFailures = false;

  // Check Node version (should be Node 20)
  try {
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0], 10);
    if (majorVersion === 20) {
      checks.push({ name: 'Node version', status: 'pass', message: `Node ${nodeVersion} (supported)` });
    } else {
      checks.push({ name: 'Node version', status: 'fail', message: `Node ${nodeVersion} (expected Node 20)` });
      hasFailures = true;
    }
  } catch (error: any) {
    checks.push({ name: 'Node version', status: 'fail', message: `Failed to check Node version: ${error.message}` });
    hasFailures = true;
  }

  // Check npm is available
  try {
    execSync('npm --version', { stdio: 'pipe' });
    checks.push({ name: 'npm available', status: 'pass', message: 'npm is available' });
  } catch (error: any) {
    checks.push({ name: 'npm available', status: 'fail', message: 'npm is not available' });
    hasFailures = true;
  }

  // Check git is available
  try {
    execSync('git --version', { stdio: 'pipe' });
    checks.push({ name: 'git available', status: 'pass', message: 'git is available' });
  } catch (error: any) {
    checks.push({ name: 'git available', status: 'fail', message: 'git is not available' });
    hasFailures = true;
  }

  // Check current directory is a git repo
  try {
    execSync('git rev-parse --is-inside-work-tree', { stdio: 'pipe', cwd: process.cwd() });
    checks.push({ name: 'git repo', status: 'pass', message: 'Current directory is a git repository' });
  } catch (error: any) {
    checks.push({ name: 'git repo', status: 'fail', message: 'Current directory is not a git repository' });
    hasFailures = true;
  }

  // Check working tree is clean (warn if not, don't fail)
  try {
    const status = execSync('git status --porcelain', { stdio: 'pipe', encoding: 'utf-8', cwd: process.cwd() });
    if (status.trim() === '') {
      checks.push({ name: 'working tree', status: 'pass', message: 'Working tree is clean' });
    } else {
      checks.push({ name: 'working tree', status: 'warn', message: 'Working tree has uncommitted changes' });
    }
  } catch (error: any) {
    // If git repo check passed but status fails, it's a warning
    checks.push({ name: 'working tree', status: 'warn', message: 'Could not check working tree status' });
  }

  // Check package-lock.json exists (warn if not, don't fail)
  const packageLockPath = join(process.cwd(), 'package-lock.json');
  try {
    await fs.access(packageLockPath);
    checks.push({ name: 'package-lock.json', status: 'pass', message: 'package-lock.json exists' });
  } catch (error: any) {
    checks.push({ name: 'package-lock.json', status: 'warn', message: 'package-lock.json not found (recommended for deterministic installs)' });
  }

  // Check write permissions in repo root
  try {
    const testFile = join(process.cwd(), '.lattice-doctor-test');
    try {
      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);
      checks.push({ name: 'write permissions', status: 'pass', message: 'Write permissions in repo root' });
    } catch (error: any) {
      checks.push({ name: 'write permissions', status: 'fail', message: 'No write permissions in repo root' });
      hasFailures = true;
    }
  } catch (error: any) {
    checks.push({ name: 'write permissions', status: 'fail', message: `Failed to check write permissions: ${error.message}` });
    hasFailures = true;
  }

  // Print results
  console.log('\nLattice Doctor - Environment Checks\n');
  for (const check of checks) {
    const icon = check.status === 'pass' ? '✓' : check.status === 'warn' ? '⚠' : '✗';
    console.log(`${icon} ${check.name}: ${check.message}`);
  }
  console.log('');

  // Exit with appropriate code
  if (hasFailures) {
    process.exit(1);
  }
}

async function verifyRules(rulesPath?: string, expectedStack?: string): Promise<void> {
  const rulesFilePath = rulesPath || join(process.cwd(), '.cursor', 'rules.md');
  
  let rulesContent: string;
  try {
    rulesContent = await fs.readFile(rulesFilePath, 'utf-8');
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      throw new Error(`Rules file not found: ${rulesFilePath}`);
    }
    throw new Error(`Failed to read rules file: ${rulesFilePath} - ${error.message}`);
  }

  // Verify versioning header exists
  const headerMatch = rulesContent.match(/<!--\nlatticeVersion: (.*)\nstack: (.*)\npolicyVersion: (.*)\nconfigHash: (.*)\n-->/);
  if (!headerMatch) {
    throw new Error(`Rules file missing versioning header. Expected format:\n<!--\nlatticeVersion: <version>\nstack: <stack>\npolicyVersion: <version>\nconfigHash: <hash>\n-->`);
  }

  const [, latticeVersion, stack, policyVersion, configHash] = headerMatch;

  // Verify latticeVersion matches current version
  const currentVersion = await getLatticeVersion();
  if (latticeVersion !== currentVersion) {
    throw new Error(`Rules file has outdated latticeVersion. Expected: ${currentVersion}, Got: ${latticeVersion}`);
  }

  // Verify stack if expected
  if (expectedStack && stack !== expectedStack) {
    throw new Error(`Rules file has incorrect stack. Expected: ${expectedStack}, Got: ${stack}`);
  }

  // Verify stack is valid
  if (stack !== 'nextjs' && stack !== 'expo-eas') {
    throw new Error(`Rules file has invalid stack value: ${stack}. Must be 'nextjs' or 'expo-eas'`);
  }

  // Verify policyVersion format
  if (!/^\d+\.\d+\.\d+$/.test(policyVersion)) {
    throw new Error(`Rules file has invalid policyVersion format: ${policyVersion}. Expected semantic version (e.g., 1.0.0)`);
  }

  // Verify configHash is SHA-256 (64 hex characters)
  if (!/^[a-f0-9]{64}$/i.test(configHash)) {
    throw new Error(`Rules file has invalid configHash format: ${configHash}. Expected SHA-256 hash (64 hex characters)`);
  }

  // Verify required sections exist
  const requiredSections = [
    'Core Operating Rules',
    'Execution Discipline',
    'Hard Stop Conditions',
    'Non-Goals',
    'Priority Order',
  ];

  const missingSections: string[] = [];
  for (const section of requiredSections) {
    if (!rulesContent.includes(`## ${section}`)) {
      missingSections.push(section);
    }
  }

  if (missingSections.length > 0) {
    throw new Error(`Rules file missing required sections: ${missingSections.join(', ')}`);
  }

  // Verify stack-specific section exists
  if (stack === 'nextjs') {
    if (!rulesContent.includes('## Next.js-Specific Guidelines')) {
      throw new Error(`Rules file missing required section: Next.js-Specific Guidelines`);
    }
    if (!rulesContent.includes('Next.js') || !rulesContent.includes('App Router')) {
      throw new Error(`Rules file missing Next.js-specific content`);
    }
  } else if (stack === 'expo-eas') {
    if (!rulesContent.includes('## Expo EAS-Specific Guidelines')) {
      throw new Error(`Rules file missing required section: Expo EAS-Specific Guidelines`);
    }
    if (!rulesContent.includes('Expo') || !rulesContent.includes('EAS')) {
      throw new Error(`Rules file missing Expo EAS-specific content`);
    }
  }

  console.log(`✓ Rules file verified successfully`);
  console.log(`  latticeVersion: ${latticeVersion}`);
  console.log(`  stack: ${stack}`);
  console.log(`  policyVersion: ${policyVersion}`);
  console.log(`  configHash: ${configHash.substring(0, 8)}...`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'init') {
    const projectTypeIndex = args.indexOf('--projectType') + 1;
    const presetIndex = args.indexOf('--preset') + 1;
    const billingIndex = args.indexOf('--billing') + 1;
    const analyticsIndex = args.indexOf('--analytics') + 1;
    const observabilityIndex = args.indexOf('--observability') + 1;
    const testingIndex = args.indexOf('--testing') + 1;
    const force = args.includes('--force');

    const projectType = projectTypeIndex > 0 && args[projectTypeIndex] ? args[projectTypeIndex] : undefined;
    const preset = presetIndex > 0 && args[presetIndex] ? args[presetIndex] : undefined;
    const billing = billingIndex > 0 && args[billingIndex] ? args[billingIndex] : undefined;
    const analytics = analyticsIndex > 0 && args[analyticsIndex] ? args[analyticsIndex] : undefined;
    const observability = observabilityIndex > 0 && args[observabilityIndex] ? args[observabilityIndex] : undefined;
    const testing = testingIndex > 0 && args[testingIndex] ? args[testingIndex] : undefined;

    await init(projectType, preset, billing, analytics, observability, testing, force);
  } else if (command === 'generate') {
    const outputIndex = args.indexOf('--output') + 1;
    const configIndex = args.indexOf('--config') + 1;
    const outputDir = outputIndex > 0 && args[outputIndex] ? args[outputIndex] : './lattice-pack';
    const configPath = configIndex > 0 && args[configIndex] ? args[configIndex] : undefined;

    await generate(outputDir, configPath);
  } else if (command === 'apply') {
    const packIndex = args.indexOf('--pack') + 1;
    const targetIndex = args.indexOf('--target') + 1;
    const packDir = packIndex > 0 && args[packIndex] ? args[packIndex] : './lattice-pack';
    const targetDir = targetIndex > 0 && args[targetIndex] ? args[targetIndex] : '.';

    await apply(packDir, targetDir);
  } else if (command === 'verify-rules') {
    const rulesIndex = args.indexOf('--rules') + 1;
    const stackIndex = args.indexOf('--stack') + 1;
    const rulesPath = rulesIndex > 0 && args[rulesIndex] ? args[rulesIndex] : undefined;
    const expectedStack = stackIndex > 0 && args[stackIndex] ? args[stackIndex] : undefined;

    await verifyRules(rulesPath, expectedStack);
  } else if (command === 'doctor') {
    await doctor();
  } else {
    console.error('Usage:');
    console.error('  lattice init --projectType <nextjs|expo-eas> --preset <startup|pro|enterprise> [--billing <none|stripe|revenuecat>] [--analytics <none|amplitude|mixpanel|posthog>] [--observability <none|sentry>] [--testing <none|unit|unit-e2e>] [--force]');
    console.error('  lattice generate [--output <dir>] [--config <path>]');
    console.error('  lattice apply [--pack <dir>] [--target <dir>]');
    console.error('  lattice verify-rules [--rules <path>] [--stack <stack>]');
    console.error('  lattice doctor');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Error:', error.message);
    process.exit(1);
  });
}

export { generate, apply, verifyRules, init, doctor };
