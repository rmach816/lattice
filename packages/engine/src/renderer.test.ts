import { Renderer } from './renderer';
import { InMemoryPluginRegistry } from './plugin';
import { validateProjectConfig } from './config';
import { resolvePolicy } from './policy';
import { NextJsPlugin } from './plugins/stack/nextjs';

describe('Renderer', () => {
  let registry: InMemoryPluginRegistry;
  let renderer: Renderer;

  beforeEach(() => {
    registry = new InMemoryPluginRegistry();
    renderer = new Renderer(registry);
  });

  describe('determinism', () => {
    it('should produce identical output for identical inputs', () => {
      registry.register(new NextJsPlugin());

      const config = validateProjectConfig({
        projectType: 'nextjs',
        strictnessPreset: 'startup',
      });
      const policy = resolvePolicy(config);

      const result1 = renderer.render(config, policy);
      const result2 = renderer.render(config, policy);

      expect(result1.manifest.configHash).toBe(result2.manifest.configHash);
      expect(result1.manifest.generatorVersion).toBe(result2.manifest.generatorVersion);
      expect(result1.manifest.policyVersion).toBe(result2.manifest.policyVersion);

      expect(result1.files.size).toBe(result2.files.size);
      expect(Array.from(result1.files.keys())).toEqual(Array.from(result2.files.keys()));

      for (const [path, content1] of result1.files.entries()) {
        const content2 = result2.files.get(path);
        expect(content2).toBeDefined();
        expect(content1.equals(content2!)).toBe(true);

        const manifest1 = result1.manifest.files.find((f) => f.path === path);
        const manifest2 = result2.manifest.files.find((f) => f.path === path);
        expect(manifest1?.sha256).toBe(manifest2?.sha256);
      }
    });

    it('should produce stable file ordering', () => {
      registry.register(new NextJsPlugin());

      const config = validateProjectConfig({
        projectType: 'nextjs',
        strictnessPreset: 'startup',
      });
      const policy = resolvePolicy(config);

      const result1 = renderer.render(config, policy);
      const result2 = renderer.render(config, policy);

      const paths1 = Array.from(result1.files.keys());
      const paths2 = Array.from(result2.files.keys());

      expect(paths1).toEqual(paths2);
      expect(paths1).toEqual(paths1.slice().sort());
    });

    it('should produce stable manifest file ordering', () => {
      registry.register(new NextJsPlugin());

      const config = validateProjectConfig({
        projectType: 'nextjs',
        strictnessPreset: 'startup',
      });
      const policy = resolvePolicy(config);

      const result1 = renderer.render(config, policy);
      const result2 = renderer.render(config, policy);

      const manifestPaths1 = result1.manifest.files.map((f) => f.path);
      const manifestPaths2 = result2.manifest.files.map((f) => f.path);

      expect(manifestPaths1).toEqual(manifestPaths2);
      expect(manifestPaths1).toEqual(manifestPaths1.slice().sort());
    });

    it('should produce identical SHA256 hashes for identical content', () => {
      registry.register(new NextJsPlugin());

      const config = validateProjectConfig({
        projectType: 'nextjs',
        strictnessPreset: 'startup',
      });
      const policy = resolvePolicy(config);

      const result1 = renderer.render(config, policy);
      const result2 = renderer.render(config, policy);

      for (const file1 of result1.manifest.files) {
        const file2 = result2.manifest.files.find((f) => f.path === file1.path);
        expect(file2).toBeDefined();
        expect(file1.sha256).toBe(file2!.sha256);
      }
    });

    it('should produce different config hashes for different configs', () => {
      registry.register(new NextJsPlugin());

      const config1 = validateProjectConfig({
        projectType: 'nextjs',
        strictnessPreset: 'startup',
      });
      const config2 = validateProjectConfig({
        projectType: 'nextjs',
        strictnessPreset: 'pro',
      });

      const policy1 = resolvePolicy(config1);
      const policy2 = resolvePolicy(config2);

      const result1 = renderer.render(config1, policy1);
      const result2 = renderer.render(config2, policy2);

      expect(result1.manifest.configHash).not.toBe(result2.manifest.configHash);
    });

    it('should normalize line endings to LF', () => {
      registry.register(new NextJsPlugin());

      const config = validateProjectConfig({
        projectType: 'nextjs',
        strictnessPreset: 'startup',
      });
      const policy = resolvePolicy(config);

      const result = renderer.render(config, policy);

      for (const [path, content] of result.files.entries()) {
        if (path.endsWith('.ts') || path.endsWith('.tsx') || path.endsWith('.js') || path.endsWith('.json')) {
          const text = content.toString('utf-8');
          expect(text).not.toContain('\r\n');
          expect(text).not.toContain('\r');
        }
      }
    });
  });

  describe('nextjs plugin', () => {
    it('should generate expected files for nextjs project', () => {
      registry.register(new NextJsPlugin());

      const config = validateProjectConfig({
        projectType: 'nextjs',
        strictnessPreset: 'startup',
      });
      const policy = resolvePolicy(config);

      const result = renderer.render(config, policy);

      expect(result.files.has('package.json')).toBe(true);
      expect(result.files.has('tsconfig.json')).toBe(true);
      expect(result.files.has('next.config.js')).toBe(true);
      expect(result.files.has('app/layout.tsx')).toBe(true);
      expect(result.files.has('app/page.tsx')).toBe(true);
    });

    it('should generate valid JSON files', () => {
      registry.register(new NextJsPlugin());

      const config = validateProjectConfig({
        projectType: 'nextjs',
        strictnessPreset: 'startup',
      });
      const policy = resolvePolicy(config);

      const result = renderer.render(config, policy);

      const packageJson = result.files.get('package.json');
      expect(packageJson).toBeDefined();
      expect(() => JSON.parse(packageJson!.toString('utf-8'))).not.toThrow();

      const tsconfigJson = result.files.get('tsconfig.json');
      expect(tsconfigJson).toBeDefined();
      expect(() => JSON.parse(tsconfigJson!.toString('utf-8'))).not.toThrow();
    });
  });
});

