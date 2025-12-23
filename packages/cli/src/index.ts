#!/usr/bin/env node

import { promises as fs } from 'fs';
import { join, dirname, resolve } from 'path';
import { Renderer } from '@lattice/engine';
import { InMemoryPluginRegistry } from '@lattice/engine';
import { NextJsPlugin } from '@lattice/engine';
import { validateProjectConfig } from '@lattice/engine';
import { resolvePolicy } from '@lattice/engine';
import type { Manifest } from '@lattice/engine';

async function writeFiles(
  files: Map<string, Buffer>,
  outputDir: string
): Promise<void> {
  for (const [path, content] of files.entries()) {
    const fullPath = join(outputDir, path);
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
    config = validateProjectConfig({
      projectType: 'nextjs',
      strictnessPreset: 'startup',
    });
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

  const absTargetDir = resolve(targetDir);
  await fs.mkdir(absTargetDir, { recursive: true });

  console.log(`Applying pack from ${packDir} to ${absTargetDir}...`);

  const conflicts: string[] = [];
  let added = 0;

  for (const file of manifest.files) {
    const sourcePath = join(packDir, file.path);
    const targetPath = join(absTargetDir, file.path);

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

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'generate') {
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
  } else {
    console.error('Usage:');
    console.error('  lattice generate [--output <dir>] [--config <path>]');
    console.error('  lattice apply [--pack <dir>] [--target <dir>]');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Error:', error.message);
    process.exit(1);
  });
}

export { generate, apply };
