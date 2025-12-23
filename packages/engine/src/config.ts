import { z } from 'zod';

export const ProjectConfigSchema = z.object({
  projectType: z.enum(['expo-eas', 'nextjs']),
  backend: z.enum(['supabase']).optional(),
  packageManager: z.enum(['npm']).default('npm'),
  strictnessPreset: z.enum(['startup', 'pro', 'enterprise']).default('startup'),
  testingLevel: z.enum(['none', 'unit', 'unit-e2e']).default('none'),
  billingProvider: z.enum(['none', 'revenuecat', 'stripe']).default('none'),
  analyticsProvider: z.enum(['none', 'amplitude', 'mixpanel', 'posthog']).default('none'),
  observability: z.enum(['none', 'sentry']).default('none'),
});

export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;

export function validateProjectConfig(input: unknown): ProjectConfig {
  return ProjectConfigSchema.parse(input);
}

