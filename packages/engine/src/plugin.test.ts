import {
  InMemoryPluginRegistry,
  buildDependencyGraph,
  detectCycles,
  resolvePluginOrder,
  groupPluginsByPhase,
} from './plugin';
import type { Plugin } from './plugin';

class TestPlugin implements Plugin {
  constructor(
    public id: string,
    public version: string = '0.1.0',
    public dependencies?: string[],
    public phase?: 'pre' | 'render' | 'post' | 'ci'
  ) {}

  appliesTo(): boolean {
    return true;
  }

  apply(): void {
    // no-op
  }
}

describe('Plugin System', () => {
  describe('InMemoryPluginRegistry', () => {
    it('should register and retrieve plugins', () => {
      const registry = new InMemoryPluginRegistry();
      const plugin = new TestPlugin('test/plugin');

      registry.register(plugin);
      expect(registry.get('test/plugin')).toBe(plugin);
    });

    it('should throw on duplicate registration', () => {
      const registry = new InMemoryPluginRegistry();
      const plugin1 = new TestPlugin('test/plugin');
      const plugin2 = new TestPlugin('test/plugin');

      registry.register(plugin1);
      expect(() => registry.register(plugin2)).toThrow();
    });

    it('should return all plugins', () => {
      const registry = new InMemoryPluginRegistry();
      const plugin1 = new TestPlugin('test/plugin1');
      const plugin2 = new TestPlugin('test/plugin2');

      registry.register(plugin1);
      registry.register(plugin2);

      const all = registry.getAll();
      expect(all.length).toBe(2);
    });
  });

  describe('buildDependencyGraph', () => {
    it('should build a simple graph', () => {
      const plugins: Plugin[] = [
        new TestPlugin('a'),
        new TestPlugin('b', '0.1.0', ['a']),
      ];

      const graph = buildDependencyGraph(plugins);

      expect(graph.nodes.has('a')).toBe(true);
      expect(graph.nodes.has('b')).toBe(true);
      expect(graph.edges.get('b')?.has('a')).toBe(true);
    });
  });

  describe('detectCycles', () => {
    it('should detect a simple cycle', () => {
      const plugins: Plugin[] = [
        new TestPlugin('a', '0.1.0', ['b']),
        new TestPlugin('b', '0.1.0', ['a']),
      ];

      const graph = buildDependencyGraph(plugins);
      const cycles = detectCycles(graph);

      expect(cycles.length).toBeGreaterThan(0);
    });

    it('should not detect cycles in acyclic graph', () => {
      const plugins: Plugin[] = [
        new TestPlugin('a'),
        new TestPlugin('b', '0.1.0', ['a']),
        new TestPlugin('c', '0.1.0', ['b']),
      ];

      const graph = buildDependencyGraph(plugins);
      const cycles = detectCycles(graph);

      expect(cycles.length).toBe(0);
    });
  });

  describe('resolvePluginOrder', () => {
    it('should order plugins by dependencies', () => {
      const registry = new InMemoryPluginRegistry();
      const pluginA = new TestPlugin('a');
      const pluginB = new TestPlugin('b', '0.1.0', ['a']);

      registry.register(pluginA);
      registry.register(pluginB);

      const ordered = resolvePluginOrder([pluginB, pluginA], registry);

      expect(ordered[0].id).toBe('a');
      expect(ordered[1].id).toBe('b');
    });

    it('should throw on missing dependency', () => {
      const registry = new InMemoryPluginRegistry();
      const pluginB = new TestPlugin('b', '0.1.0', ['a']);

      registry.register(pluginB);

      expect(() => {
        resolvePluginOrder([pluginB], registry);
      }).toThrow();
    });

    it('should throw on cycle', () => {
      const registry = new InMemoryPluginRegistry();
      const pluginA = new TestPlugin('a', '0.1.0', ['b']);
      const pluginB = new TestPlugin('b', '0.1.0', ['a']);

      registry.register(pluginA);
      registry.register(pluginB);

      expect(() => {
        resolvePluginOrder([pluginA, pluginB], registry);
      }).toThrow();
    });

    it('should sort independent plugins by id', () => {
      const registry = new InMemoryPluginRegistry();
      const pluginC = new TestPlugin('c');
      const pluginA = new TestPlugin('a');
      const pluginB = new TestPlugin('b');

      registry.register(pluginA);
      registry.register(pluginB);
      registry.register(pluginC);

      const ordered = resolvePluginOrder([pluginC, pluginB, pluginA], registry);

      expect(ordered[0].id).toBe('a');
      expect(ordered[1].id).toBe('b');
      expect(ordered[2].id).toBe('c');
    });
  });

  describe('groupPluginsByPhase', () => {
    it('should group plugins by phase', () => {
      const plugins: Plugin[] = [
        new TestPlugin('pre1', '0.1.0', undefined, 'pre'),
        new TestPlugin('render1', '0.1.0', undefined, 'render'),
        new TestPlugin('post1', '0.1.0', undefined, 'post'),
        new TestPlugin('ci1', '0.1.0', undefined, 'ci'),
      ];

      const grouped = groupPluginsByPhase(plugins);

      expect(grouped.get('pre')?.length).toBe(1);
      expect(grouped.get('render')?.length).toBe(1);
      expect(grouped.get('post')?.length).toBe(1);
      expect(grouped.get('ci')?.length).toBe(1);
    });

    it('should default to render phase', () => {
      const plugins: Plugin[] = [new TestPlugin('test')];

      const grouped = groupPluginsByPhase(plugins);

      expect(grouped.get('render')?.length).toBe(1);
    });

    it('should sort plugins within phase by id', () => {
      const plugins: Plugin[] = [
        new TestPlugin('b', '0.1.0', undefined, 'render'),
        new TestPlugin('a', '0.1.0', undefined, 'render'),
      ];

      const grouped = groupPluginsByPhase(plugins);

      const renderPlugins = grouped.get('render') || [];
      expect(renderPlugins[0].id).toBe('a');
      expect(renderPlugins[1].id).toBe('b');
    });
  });
});

