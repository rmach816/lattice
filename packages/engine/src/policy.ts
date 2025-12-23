import type { StrictnessPreset } from './types';
import type { ProjectConfig } from './config';

export interface Policy {
  version: string;
  requiredChecks: string[];
  versionPosture: 'latest-major' | 'pinned-minor' | 'pinned-exact';
  runtimeSafety: {
    boundaryValidationRequired: boolean;
  };
  process: {
    codeownersRequired: boolean;
    auditTrailRequired: boolean;
  };
}

const BASE_POLICY: Policy = {
  version: '1.0.0',
  requiredChecks: [],
  versionPosture: 'latest-major',
  runtimeSafety: {
    boundaryValidationRequired: false,
  },
  process: {
    codeownersRequired: false,
    auditTrailRequired: false,
  },
};

const PRESET_POLICIES: Record<StrictnessPreset, Partial<Policy>> = {
  startup: {
    requiredChecks: ['lint', 'typecheck'],
    versionPosture: 'latest-major',
    runtimeSafety: {
      boundaryValidationRequired: false,
    },
  },
  pro: {
    requiredChecks: ['lint', 'typecheck', 'test', 'build'],
    versionPosture: 'pinned-minor',
    runtimeSafety: {
      boundaryValidationRequired: true,
    },
  },
  enterprise: {
    requiredChecks: ['lint', 'typecheck', 'test', 'build', 'e2e', 'security', 'audit'],
    versionPosture: 'pinned-exact',
    runtimeSafety: {
      boundaryValidationRequired: true,
    },
    process: {
      codeownersRequired: true,
      auditTrailRequired: true,
    },
  },
};

export function resolvePolicy(config: ProjectConfig): Policy {
  const preset = PRESET_POLICIES[config.strictnessPreset];
  
  return {
    ...BASE_POLICY,
    ...preset,
    runtimeSafety: {
      ...BASE_POLICY.runtimeSafety,
      ...(preset?.runtimeSafety || {}),
    },
    process: {
      ...BASE_POLICY.process,
      ...(preset?.process || {}),
    },
  };
}

