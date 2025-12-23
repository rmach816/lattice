import { resolvePolicy } from './policy';
import { validateProjectConfig } from './config';

describe('Policy', () => {
  it('should resolve startup preset', () => {
    const config = validateProjectConfig({
      projectType: 'nextjs',
      strictnessPreset: 'startup',
    });

    const policy = resolvePolicy(config);

    expect(policy.version).toBe('1.0.0');
    expect(policy.requiredChecks).toContain('lint');
    expect(policy.requiredChecks).toContain('typecheck');
    expect(policy.versionPosture).toBe('latest-major');
    expect(policy.runtimeSafety.boundaryValidationRequired).toBe(false);
  });

  it('should resolve pro preset', () => {
    const config = validateProjectConfig({
      projectType: 'nextjs',
      strictnessPreset: 'pro',
    });

    const policy = resolvePolicy(config);

    expect(policy.requiredChecks).toContain('lint');
    expect(policy.requiredChecks).toContain('typecheck');
    expect(policy.requiredChecks).toContain('test');
    expect(policy.requiredChecks).toContain('build');
    expect(policy.versionPosture).toBe('pinned-minor');
    expect(policy.runtimeSafety.boundaryValidationRequired).toBe(true);
  });

  it('should resolve enterprise preset', () => {
    const config = validateProjectConfig({
      projectType: 'nextjs',
      strictnessPreset: 'enterprise',
    });

    const policy = resolvePolicy(config);

    expect(policy.requiredChecks).toContain('lint');
    expect(policy.requiredChecks).toContain('typecheck');
    expect(policy.requiredChecks).toContain('test');
    expect(policy.requiredChecks).toContain('build');
    expect(policy.requiredChecks).toContain('e2e');
    expect(policy.requiredChecks).toContain('security');
    expect(policy.requiredChecks).toContain('audit');
    expect(policy.versionPosture).toBe('pinned-exact');
    expect(policy.runtimeSafety.boundaryValidationRequired).toBe(true);
    expect(policy.process.codeownersRequired).toBe(true);
    expect(policy.process.auditTrailRequired).toBe(true);
  });
});

