import type {
  ValidationResult,
} from './types';
import type { ProjectConfig } from './config';

export type PluginId = string;
export type PluginPhase = 'pre' | 'render' | 'post' | 'ci';
export type ConflictPolicy = 'error' | 'last-wins';
import type { GeneratorContext } from './context';

export interface Plugin {
  id: PluginId;
  version: string;
  dependencies?: PluginId[];
  appliesTo(config: ProjectConfig): boolean;
  phase?: PluginPhase;
  conflictPolicy?: ConflictPolicy;
  apply(ctx: GeneratorContext): void;
  validate?(ctx: GeneratorContext): ValidationResult;
}

export interface PluginRegistry {
  register(plugin: Plugin): void;
  get(id: PluginId): Plugin | undefined;
  getAll(): Plugin[];
}

export class InMemoryPluginRegistry implements PluginRegistry {
  private plugins: Map<PluginId, Plugin> = new Map();

  register(plugin: Plugin): void {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin ${plugin.id} is already registered`);
    }
    this.plugins.set(plugin.id, plugin);
  }

  get(id: PluginId): Plugin | undefined {
    return this.plugins.get(id);
  }

  getAll(): Plugin[] {
    return Array.from(this.plugins.values());
  }
}

export interface DependencyGraph {
  nodes: Set<PluginId>;
  edges: Map<PluginId, Set<PluginId>>;
}

export function buildDependencyGraph(plugins: Plugin[]): DependencyGraph {
  const nodes = new Set<PluginId>();
  const edges = new Map<PluginId, Set<PluginId>>();

  for (const plugin of plugins) {
    nodes.add(plugin.id);
    if (plugin.dependencies && plugin.dependencies.length > 0) {
      const deps = new Set<PluginId>(plugin.dependencies);
      edges.set(plugin.id, deps);
      for (const dep of plugin.dependencies) {
        nodes.add(dep);
      }
    }
  }

  return { nodes, edges };
}

export function detectCycles(graph: DependencyGraph): string[] {
  const errors: string[] = [];
  const visited = new Set<PluginId>();
  const recursionStack = new Set<PluginId>();

  function visit(node: PluginId, path: PluginId[]): void {
    if (recursionStack.has(node)) {
      const cycleStart = path.indexOf(node);
      const cycle = [...path.slice(cycleStart), node].join(' -> ');
      errors.push(`Dependency cycle detected: ${cycle}`);
      return;
    }

    if (visited.has(node)) {
      return;
    }

    visited.add(node);
    recursionStack.add(node);

    const deps = graph.edges.get(node);
    if (deps) {
      for (const dep of deps) {
        visit(dep, [...path, node]);
      }
    }

    recursionStack.delete(node);
  }

  for (const node of graph.nodes) {
    if (!visited.has(node)) {
      visit(node, []);
    }
  }

  return errors;
}

export function resolvePluginOrder(
  plugins: Plugin[],
  registry: PluginRegistry
): Plugin[] {
  const applicablePlugins = plugins.filter((p) => {
    const plugin = registry.get(p.id);
    return plugin !== undefined;
  });

  const graph = buildDependencyGraph(applicablePlugins);
  
  const cycleErrors = detectCycles(graph);
  if (cycleErrors.length > 0) {
    throw new Error(`Plugin dependency errors:\n${cycleErrors.join('\n')}`);
  }

  const missingDeps: string[] = [];
  for (const plugin of applicablePlugins) {
    if (plugin.dependencies) {
      for (const dep of plugin.dependencies) {
        if (!registry.get(dep)) {
          missingDeps.push(`Plugin ${plugin.id} depends on unknown plugin: ${dep}`);
        }
      }
    }
  }
  if (missingDeps.length > 0) {
    throw new Error(`Missing plugin dependencies:\n${missingDeps.join('\n')}`);
  }

  const sorted: Plugin[] = [];
  const visited = new Set<PluginId>();
  const visiting = new Set<PluginId>();

  function visit(pluginId: PluginId): void {
    if (visiting.has(pluginId)) {
      return;
    }
    if (visited.has(pluginId)) {
      return;
    }

    visiting.add(pluginId);
    const plugin = registry.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found in registry`);
    }

    if (plugin.dependencies) {
      const sortedDeps = [...plugin.dependencies].sort();
      for (const dep of sortedDeps) {
        visit(dep);
      }
    }

    visiting.delete(pluginId);
    visited.add(pluginId);

    if (!sorted.find((p) => p.id === pluginId)) {
      sorted.push(plugin);
    }
  }

  const sortedPlugins = [...applicablePlugins].sort((a, b) => a.id.localeCompare(b.id));
  for (const plugin of sortedPlugins) {
    visit(plugin.id);
  }

  return sorted;
}

export function groupPluginsByPhase(plugins: Plugin[]): Map<PluginPhase, Plugin[]> {
  const grouped = new Map<PluginPhase, Plugin[]>();
  const phases: PluginPhase[] = ['pre', 'render', 'post', 'ci'];

  for (const phase of phases) {
    grouped.set(phase, []);
  }

  for (const plugin of plugins) {
    const phase = plugin.phase || 'render';
    const group = grouped.get(phase);
    if (group) {
      group.push(plugin);
    }
  }

  for (const phase of phases) {
    const group = grouped.get(phase);
    if (group) {
      group.sort((a, b) => a.id.localeCompare(b.id));
    }
  }

  return grouped;
}

