import { validateProjectConfig } from './config';

describe('ProjectConfig', () => {
  it('should validate a minimal config', () => {
    const config = validateProjectConfig({
      projectType: 'nextjs',
    });

    expect(config.projectType).toBe('nextjs');
    expect(config.packageManager).toBe('npm');
    expect(config.strictnessPreset).toBe('startup');
  });

  it('should validate a full config', () => {
    const config = validateProjectConfig({
      projectType: 'nextjs',
      backend: 'supabase',
      packageManager: 'npm',
      strictnessPreset: 'pro',
      testingLevel: 'unit',
      billingProvider: 'stripe',
      analyticsProvider: 'amplitude',
      observability: 'sentry',
    });

    expect(config.projectType).toBe('nextjs');
    expect(config.backend).toBe('supabase');
    expect(config.strictnessPreset).toBe('pro');
  });

  it('should reject invalid projectType', () => {
    expect(() => {
      validateProjectConfig({
        projectType: 'invalid',
      });
    }).toThrow();
  });

  it('should reject invalid strictnessPreset', () => {
    expect(() => {
      validateProjectConfig({
        projectType: 'nextjs',
        strictnessPreset: 'invalid',
      });
    }).toThrow();
  });
});

