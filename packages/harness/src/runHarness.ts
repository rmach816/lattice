import { promises as fs } from 'fs';
import { join, dirname } from 'path';
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

function runCommand(command: string, cwd: string): void {
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
  } catch (error: any) {
    if (error.stdout) {
      console.log(error.stdout);
    }
    if (error.stderr) {
      console.error(error.stderr);
    }
    console.error(`Command failed: ${command}`);
    throw error;
  }
}

async function runFixture(
  fixtureDir: string,
  plugin: any,
  projectType: 'nextjs' | 'expo-eas',
  buildCommand: string
): Promise<void> {
  console.log(`\n=== Running ${projectType} fixture ===`);

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

  console.log('Running verification commands...');
  const lockFile = join(fixtureDir, 'package-lock.json');
  let lockFileExisted = true;
  try {
    await fs.access(lockFile);
  } catch {
    console.log('Generating package-lock.json...');
    runCommand('npm install', fixtureDir);
    lockFileExisted = false;
  }
  
  // Only run npm ci if the lock file already existed
  // If we just generated it with npm install, skip npm ci to avoid Windows file locking issues
  if (lockFileExisted) {
    runCommand('npm ci', fixtureDir);
  }
  runCommand('npm run lint', fixtureDir);
  runCommand('npm run typecheck', fixtureDir);
  runCommand('npm test', fixtureDir);
  runCommand(buildCommand, fixtureDir);

  console.log(`${projectType} fixture completed successfully!`);
}

async function runHarness(): Promise<void> {
  console.log('Starting harness...');

  await runFixture(NEXT_FIXTURE_DIR, new NextJsPlugin(), 'nextjs', 'npm run build');
  await runFixture(EXPO_FIXTURE_DIR, new ExpoEasPlugin(), 'expo-eas', 'npm run typecheck');

  console.log('\nHarness completed successfully!');
}

if (require.main === module) {
  runHarness().catch((error) => {
    console.error('Harness failed:', error);
    process.exit(1);
  });
}

export { runHarness };

