export type ProjectType = 'expo-eas' | 'nextjs';

export type StrictnessPreset = 'startup' | 'pro' | 'enterprise';

export type TestingLevel = 'none' | 'unit' | 'unit-e2e';

export type BillingProvider = 'none' | 'revenuecat' | 'stripe';

export type AnalyticsProvider = 'none' | 'amplitude' | 'mixpanel' | 'posthog';

export type ObservabilityProvider = 'none' | 'sentry';

export interface FileMap {
  [path: string]: Buffer;
}

export interface Manifest {
  generatorVersion: string;
  policyVersion: string;
  configHash: string;
  files: Array<{
    path: string;
    sha256: string;
  }>;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

