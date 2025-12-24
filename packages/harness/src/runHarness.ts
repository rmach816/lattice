import { promises as fs } from 'fs';
import { join, dirname, resolve } from 'path';
import { execSync } from 'child_process';
import { Renderer } from '@lattice/engine';
import { InMemoryPluginRegistry } from '@lattice/engine';
import { NextJsPlugin, ExpoEasPlugin } from '@lattice/engine';
import { validateProjectConfig } from '@lattice/engine';
import { resolvePolicy } from '@lattice/engine';

const NEXT_FIXTURE_DIR = join(__dirname, '..', 'fixtures', 'next-min');
const EXPO_FIXTURE_DIR = join(__dirname, '..', 'fixtures', 'expo-min');

async function resetFixture(dir: string): Promise<void> {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch (error) {
    // Ignore if directory doesn't exist
  }
  await fs.mkdir(dir, { recursive: true });
}

async function writeFiles(files: Map<string, Buffer>, fixtureDir: string): Promise<void> {
  for (const [path, content] of files.entries()) {
    const fullPath = join(fixtureDir, path);
    const dir = dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, content);
  }
  
  // Add .gitignore to fixture
  const gitignore = `node_modules/
.next/
.expo/
out/
dist/
*.log
.DS_Store
`;
  await fs.writeFile(join(fixtureDir, '.gitignore'), gitignore);
}

interface CommandResult {
  status: 'pass' | 'fail';
  exitCode: number;
}

function runCommand(command: string, cwd: string): CommandResult {
  console.log(`Running: ${command}`);
  try {
    const result = execSync(command, {
      cwd,
      stdio: 'pipe',
      shell: process.platform === 'win32' ? 'cmd.exe' : undefined,
      encoding: 'utf-8',
    });
    if (result) {
      console.log(result);
    }
    return { status: 'pass', exitCode: 0 };
  } catch (error: any) {
    if (error.stdout) {
      console.log(error.stdout);
    }
    if (error.stderr) {
      console.error(error.stderr);
    }
    const exitCode = error.status || error.code || 1;
    console.error(`Command failed: ${command}`);
    return { status: 'fail', exitCode };
  }
}

interface FixtureResult {
  fixtureName: string;
  stack: 'nextjs' | 'expo-eas';
  startTime: string;
  endTime: string;
  durationMs: number;
  commands: Array<{
    command: string;
    status: 'pass' | 'fail';
    exitCode: number;
  }>;
  overallStatus: 'pass' | 'fail';
}

async function runFixture(
  fixtureDir: string,
  plugin: any,
  projectType: 'nextjs' | 'expo-eas',
  buildCommand: string
): Promise<FixtureResult> {
  console.log(`\n=== Running ${projectType} fixture ===`);

  const startTime = new Date().toISOString();
  const fixtureName = projectType === 'nextjs' ? 'next-min' : 'expo-min';

  // Preserve lockfile if it exists (it should be committed to fixtures)
  const lockFile = join(fixtureDir, 'package-lock.json');
  let lockFileContent: Buffer | null = null;
  try {
    lockFileContent = await fs.readFile(lockFile);
  } catch {
    // Lockfile doesn't exist - this is an error, fixtures should have lockfiles committed
    throw new Error(`package-lock.json not found in ${fixtureDir}. Lockfiles must be committed to fixtures.`);
  }

  console.log(`Resetting fixture directory: ${fixtureDir}...`);
  await resetFixture(fixtureDir);

  console.log(`Generating ${projectType} pack...`);
  const registry = new InMemoryPluginRegistry();
  registry.register(plugin);

  const config = validateProjectConfig({
    projectType,
    strictnessPreset: 'startup',
  });
  const policy = resolvePolicy(config);

  const renderer = new Renderer(registry);
  const result = renderer.render(config, policy);

  console.log(`Generated ${result.files.size} files`);
  console.log('Writing files to fixture...');
  await writeFiles(result.files, fixtureDir);

  // Restore the lockfile
  if (lockFileContent) {
    await fs.writeFile(lockFile, lockFileContent);
  }

  console.log('Running verification commands...');
  const commands: Array<{ command: string; status: 'pass' | 'fail'; exitCode: number }> = [];
  
  // Always use npm ci - lockfile should always exist
  const ciResult = runCommand('npm ci', fixtureDir);
  commands.push({ command: 'npm ci', ...ciResult });
  if (ciResult.status === 'fail') {
    throw new Error(`npm ci failed with exit code ${ciResult.exitCode}`);
  }

  const lintResult = runCommand('npm run lint', fixtureDir);
  commands.push({ command: 'npm run lint', ...lintResult });
  if (lintResult.status === 'fail') {
    throw new Error(`npm run lint failed with exit code ${lintResult.exitCode}`);
  }

  const typecheckResult = runCommand('npm run typecheck', fixtureDir);
  commands.push({ command: 'npm run typecheck', ...typecheckResult });
  if (typecheckResult.status === 'fail') {
    throw new Error(`npm run typecheck failed with exit code ${typecheckResult.exitCode}`);
  }

  const testResult = runCommand('npm test', fixtureDir);
  commands.push({ command: 'npm test', ...testResult });
  if (testResult.status === 'fail') {
    throw new Error(`npm test failed with exit code ${testResult.exitCode}`);
  }

  const buildResult = runCommand(buildCommand, fixtureDir);
  commands.push({ command: buildCommand, ...buildResult });
  if (buildResult.status === 'fail') {
    throw new Error(`${buildCommand} failed with exit code ${buildResult.exitCode}`);
  }

  // Verify rules file - use CLI from monorepo, not from fixture
  const cliPath = resolve(__dirname, '..', '..', 'cli', 'dist', 'index.js');
  const verifyRulesResult = runCommand(`node "${cliPath}" verify-rules --stack ${projectType}`, fixtureDir);
  commands.push({ command: 'lattice verify-rules', ...verifyRulesResult });
  if (verifyRulesResult.status === 'fail') {
    throw new Error(`lattice verify-rules failed with exit code ${verifyRulesResult.exitCode}`);
  }

  const endTime = new Date().toISOString();
  const durationMs = new Date(endTime).getTime() - new Date(startTime).getTime();
  
  const overallStatus = commands.every(cmd => cmd.status === 'pass') ? 'pass' : 'fail';

  console.log(`${projectType} fixture completed successfully!`);

  return {
    fixtureName,
    stack: projectType,
    startTime,
    endTime,
    durationMs,
    commands,
    overallStatus,
  };
}

async function getLatticeVersion(): Promise<string> {
  try {
    const rootPackageJson = join(__dirname, '..', '..', '..', 'package.json');
    const content = await fs.readFile(rootPackageJson, 'utf-8');
    const pkg = JSON.parse(content);
    return pkg.version || '0.0.0';
  } catch {
    try {
      const cliPackageJson = join(__dirname, '..', '..', 'cli', 'package.json');
      const content = await fs.readFile(cliPackageJson, 'utf-8');
      const pkg = JSON.parse(content);
      return pkg.version || '0.0.0';
    } catch {
      return '0.0.0';
    }
  }
}

async function runHarness(): Promise<void> {
  console.log('Starting harness...');

  const results: FixtureResult[] = [];
  const failedFixtures: string[] = [];

  try {
    const nextResult = await runFixture(NEXT_FIXTURE_DIR, new NextJsPlugin(), 'nextjs', 'npm run build');
    results.push(nextResult);
    if (nextResult.overallStatus === 'fail') {
      failedFixtures.push('next-min');
    }
  } catch (error) {
    failedFixtures.push('next-min');
    // Preserve failing fixture - don't delete it
    console.error(`next-min fixture failed and will be preserved for inspection`);
    throw error;
  }

  try {
    const expoResult = await runFixture(EXPO_FIXTURE_DIR, new ExpoEasPlugin(), 'expo-eas', 'npm run typecheck');
    results.push(expoResult);
    if (expoResult.overallStatus === 'fail') {
      failedFixtures.push('expo-min');
    }
  } catch (error) {
    failedFixtures.push('expo-min');
    // Preserve failing fixture - don't delete it
    console.error(`expo-min fixture failed and will be preserved for inspection`);
    throw error;
  }

  // Write scorecard
  const latticeVersion = await getLatticeVersion();
  const gitSha = process.env.GITHUB_SHA || undefined;

  const scorecard = {
    latticeVersion,
    ...(gitSha && { gitSha }),
    fixtures: results,
  };

  const repoRoot = resolve(__dirname, '..', '..', '..');
  const scorecardDir = join(repoRoot, '.lattice');
  const scorecardPath = join(scorecardDir, 'scorecard.json');

  await fs.mkdir(scorecardDir, { recursive: true });
  await fs.writeFile(scorecardPath, JSON.stringify(scorecard, null, 2), 'utf-8');

  console.log(`\nScorecard written to: ${scorecardPath}`);
  
  // Verify Cursor rules differ between fixtures and include versioning
  console.log('\nVerifying Cursor rules are stack-specific and versioned...');
  const nextRulesPath = join(NEXT_FIXTURE_DIR, '.cursor', 'rules.md');
  const expoRulesPath = join(EXPO_FIXTURE_DIR, '.cursor', 'rules.md');
  
  try {
    const nextRules = await fs.readFile(nextRulesPath, 'utf-8');
    const expoRules = await fs.readFile(expoRulesPath, 'utf-8');
    
    if (nextRules === expoRules) {
      throw new Error('Cursor rules are identical between nextjs and expo-eas fixtures. Rules must be stack-specific.');
    }
    
    // Verify rules contain stack-specific content
    if (!nextRules.includes('Next.js') || !nextRules.includes('App Router')) {
      throw new Error('Next.js fixture rules missing Next.js-specific content');
    }
    
    if (!expoRules.includes('Expo') || !expoRules.includes('EAS')) {
      throw new Error('Expo EAS fixture rules missing Expo-specific content');
    }
    
    // Verify versioning header in Next.js rules
    const expectedLatticeVersion = latticeVersion;
    if (!nextRules.includes(`latticeVersion: ${expectedLatticeVersion}`)) {
      throw new Error(`Next.js fixture rules missing correct latticeVersion. Expected: ${expectedLatticeVersion}`);
    }
    if (!nextRules.includes('stack: nextjs')) {
      throw new Error('Next.js fixture rules missing stack: nextjs in versioning header');
    }
    if (!nextRules.includes('policyVersion:')) {
      throw new Error('Next.js fixture rules missing policyVersion in versioning header');
    }
    if (!nextRules.includes('configHash:')) {
      throw new Error('Next.js fixture rules missing configHash in versioning header');
    }
    
    // Verify versioning header in Expo EAS rules
    if (!expoRules.includes(`latticeVersion: ${expectedLatticeVersion}`)) {
      throw new Error(`Expo EAS fixture rules missing correct latticeVersion. Expected: ${expectedLatticeVersion}`);
    }
    if (!expoRules.includes('stack: expo-eas')) {
      throw new Error('Expo EAS fixture rules missing stack: expo-eas in versioning header');
    }
    if (!expoRules.includes('policyVersion:')) {
      throw new Error('Expo EAS fixture rules missing policyVersion in versioning header');
    }
    if (!expoRules.includes('configHash:')) {
      throw new Error('Expo EAS fixture rules missing configHash in versioning header');
    }
    
    console.log('✓ Cursor rules are stack-specific, differ between fixtures, and include correct versioning');
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      throw new Error(`Cursor rules file not found: ${error.message}`);
    }
    throw error;
  }
  
  if (failedFixtures.length > 0) {
    console.log(`\nFailed fixtures preserved: ${failedFixtures.join(', ')}`);
    console.log('Harness failed!');
    process.exit(1);
  }
  
  console.log('\nHarness completed successfully!');
}

if (require.main === module) {
  runHarness().catch((error) => {
    console.error('Harness failed:', error);
    process.exit(1);
  });
}

export { runHarness };

