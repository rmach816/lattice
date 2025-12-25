import { createHash } from 'crypto';
import type { FileMap, Manifest } from './types';
import type { ProjectConfig } from './config';
import type { Policy } from './policy';
import type { PluginRegistry } from './plugin';
import {
  resolvePluginOrder,
  groupPluginsByPhase,
  buildDependencyGraph,
  detectCycles,
} from './plugin';
import { InMemoryGeneratorContext } from './context';

const GENERATOR_VERSION = '0.1.0';
const POLICY_VERSION = '1.0.0';

function normalizeLineEndings(content: Buffer): Buffer {
  const text = content.toString('utf-8');
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  return Buffer.from(normalized, 'utf-8');
}

function computeSha256(content: Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

function computeConfigHash(config: ProjectConfig): string {
  const sorted = JSON.stringify(config, Object.keys(config).sort());
  return createHash('sha256').update(sorted).digest('hex');
}

function sortFileMap(files: FileMap): Array<[string, Buffer]> {
  const entries = Object.entries(files);
  entries.sort(([a], [b]) => a.localeCompare(b));
  return entries;
}

export interface RenderResult {
  files: Map<string, Buffer>;
  manifest: Manifest;
}

export class Renderer {
  constructor(private registry: PluginRegistry) {}

  render(config: ProjectConfig, policy: Policy, existingFiles?: FileMap): RenderResult {
    const allPlugins = this.registry.getAll();
    const applicablePlugins = allPlugins.filter((p) => p.appliesTo(config));

    const graph = buildDependencyGraph(applicablePlugins);
    const cycleErrors = detectCycles(graph);
    if (cycleErrors.length > 0) {
      throw new Error(`Plugin dependency cycles:\n${cycleErrors.join('\n')}`);
    }

    const orderedPlugins = resolvePluginOrder(applicablePlugins, this.registry);
    const groupedPlugins = groupPluginsByPhase(orderedPlugins);

    const context = new InMemoryGeneratorContext(config, policy, existingFiles);
    const fileWriters = new Map<string, string[]>();

    const phases: Array<'pre' | 'render' | 'post' | 'ci'> = ['pre', 'render', 'post', 'ci'];
    for (const phase of phases) {
      const plugins = groupedPlugins.get(phase) || [];
      for (const plugin of plugins) {
        const beforeFiles = new Set(Object.keys(context.files));
        plugin.apply(context);
        const afterFiles = new Set(Object.keys(context.files));

        for (const path of afterFiles) {
          if (!beforeFiles.has(path)) {
            const writers = fileWriters.get(path) || [];
            writers.push(plugin.id);
            fileWriters.set(path, writers);
          }
        }
      }
    }

    for (const [path, writers] of fileWriters.entries()) {
      if (writers.length > 1) {
        const policies = writers.map((id) => {
          const plugin = this.registry.get(id);
          return plugin?.conflictPolicy || 'error';
        });

        if (policies.some((p) => p === 'error')) {
          throw new Error(
            `File conflict: ${path} is written by multiple plugins: ${writers.join(', ')}`
          );
        }
      }
    }

    const normalizedFiles: FileMap = {};
    for (const [path, content] of Object.entries(context.files)) {
      normalizedFiles[path] = normalizeLineEndings(content);
    }

    const sortedFiles = sortFileMap(normalizedFiles);
    const fileMap = new Map<string, Buffer>();
    const manifestFiles: Array<{ path: string; sha256: string }> = [];

    for (const [path, content] of sortedFiles) {
      fileMap.set(path, content);
      manifestFiles.push({
        path,
        sha256: computeSha256(content),
      });
    }

    const manifest: Manifest = {
      generatorVersion: GENERATOR_VERSION,
      policyVersion: POLICY_VERSION,
      configHash: computeConfigHash(config),
      files: manifestFiles,
    };

    return {
      files: fileMap,
      manifest,
    };
  }
}

