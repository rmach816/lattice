import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';
import { Renderer } from '@lattice/engine';
import { InMemoryPluginRegistry } from '@lattice/engine';
import { NextJsPlugin } from '@lattice/engine';
import { validateProjectConfig } from '@lattice/engine';
import { resolvePolicy } from '@lattice/engine';

const FIXTURE_DIR = join(__dirname, '..', 'fixtures', 'next-min');

async function resetFixture(): Promise<void> {
  try {
    await fs.rm(FIXTURE_DIR, { recursive: true, force: true });
  } catch (error) {
    // Ignore if directory doesn't exist
  }
  await fs.mkdir(FIXTURE_DIR, { recursive: true });
}

async function writeFiles(files: Map<string, Buffer>): Promise<void> {
  for (const [path, content] of files.entries()) {
    const fullPath = join(FIXTURE_DIR, path);
    const dir = dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, content);
  }
  
  // Add .gitignore to fixture
  const gitignore = `node_modules/
.next/
out/
dist/
*.log
.DS_Store
`;
  await fs.writeFile(join(FIXTURE_DIR, '.gitignore'), gitignore);
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

async function runHarness(): Promise<void> {
  console.log('Starting harness...');

  console.log('Resetting fixture directory...');
  await resetFixture();

  console.log('Generating Next.js pack...');
  const registry = new InMemoryPluginRegistry();
  registry.register(new NextJsPlugin());

  const config = validateProjectConfig({
    projectType: 'nextjs',
    strictnessPreset: 'startup',
  });
  const policy = resolvePolicy(config);

  const renderer = new Renderer(registry);
  const result = renderer.render(config, policy);

  console.log(`Generated ${result.files.size} files`);
  console.log('Writing files to fixture...');
  await writeFiles(result.files);

  console.log('Running verification commands...');
  const lockFile = join(FIXTURE_DIR, 'package-lock.json');
  try {
    await fs.access(lockFile);
  } catch {
    console.log('Generating package-lock.json...');
    runCommand('npm install', FIXTURE_DIR);
  }
  runCommand('npm ci', FIXTURE_DIR);
  runCommand('npm run lint', FIXTURE_DIR);
  runCommand('npm run typecheck', FIXTURE_DIR);
  runCommand('npm test', FIXTURE_DIR);
  runCommand('npm run build', FIXTURE_DIR);

  console.log('Harness completed successfully!');
}

if (require.main === module) {
  runHarness().catch((error) => {
    console.error('Harness failed:', error);
    process.exit(1);
  });
}

export { runHarness };

