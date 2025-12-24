import type { Plugin, PluginId, PluginPhase, ConflictPolicy } from '../../plugin';
import type { ProjectConfig } from '../../config';
import type { GeneratorContext } from '../../context';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { createHash } from 'crypto';

function getLatticeVersion(): string {
  try {
    // Try to read from repo root package.json (relative to this file)
    // This file is at: packages/engine/src/plugins/stack/expo-eas.ts
    // Need to go up 5 levels to reach repo root
    const currentDir = __dirname; // packages/engine/src/plugins/stack
    const pluginsDir = dirname(currentDir); // packages/engine/src/plugins
    const srcDir = dirname(pluginsDir); // packages/engine/src
    const engineDir = dirname(srcDir); // packages/engine
    const packagesDir = dirname(engineDir); // packages
    const repoRoot = dirname(packagesDir); // root
    const packageJsonPath = join(repoRoot, 'package.json');
    const content = readFileSync(packageJsonPath, 'utf-8');
    const pkg = JSON.parse(content);
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function computeConfigHash(config: ProjectConfig): string {
  const sorted = JSON.stringify(config, Object.keys(config).sort());
  return createHash('sha256').update(sorted).digest('hex');
}

export class ExpoEasPlugin implements Plugin {
  id: PluginId = 'stack/expo-eas';
  version = '0.1.0';
  phase: PluginPhase = 'render';
  conflictPolicy: ConflictPolicy = 'error';

  appliesTo(config: ProjectConfig): boolean {
    return config.projectType === 'expo-eas';
  }

  apply(ctx: GeneratorContext): void {
    if (ctx.hasFile('package.json')) {
      throw new Error('package.json already exists');
    }

    const packageJson = {
      name: 'my-app',
      version: '0.1.0',
      private: true,
      main: 'expo-router/entry',
      scripts: {
        start: 'expo start',
        android: 'expo start --android',
        ios: 'expo start --ios',
        web: 'expo start --web',
        lint: 'eslint .',
        typecheck: 'tsc --noEmit',
        test: 'jest',
      },
      dependencies: {
        expo: '~52.0.0',
        'expo-router': '~4.0.0',
        'expo-status-bar': '~2.0.0',
        react: '18.3.1',
        'react-native': '0.76.5',
      },
      devDependencies: {
        '@babel/core': '^7.25.0',
        '@types/react': '~18.3.12',
        typescript: '^5.3.3',
        eslint: '^9.0.0',
        '@typescript-eslint/parser': '^8.0.0',
        '@typescript-eslint/eslint-plugin': '^8.0.0',
        jest: '^29.7.0',
        '@types/jest': '^29.5.11',
        'ts-jest': '^29.1.1',
        '@testing-library/react-native': '^12.8.0',
        'react-test-renderer': '18.3.1',
        'jest-expo': '~52.0.0',
        '@testing-library/jest-native': '^5.4.3',
      },
    };

    const packageJsonContent = JSON.stringify(packageJson, null, 2) + '\n';
    ctx.addFile('package.json', Buffer.from(packageJsonContent, 'utf-8'));

    const tsconfigJson = {
      extends: 'expo/tsconfig.base',
      compilerOptions: {
        strict: true,
        paths: {
          '@/*': ['./*'],
        },
      },
      include: ['**/*.ts', '**/*.tsx', '.expo/types/**/*.ts'],
      exclude: ['node_modules'],
    };

    const tsconfigContent = JSON.stringify(tsconfigJson, null, 2) + '\n';
    ctx.addFile('tsconfig.json', Buffer.from(tsconfigContent, 'utf-8'));

    const appJson = {
      expo: {
        name: 'my-app',
        slug: 'my-app',
        version: '0.1.0',
        orientation: 'portrait',
        icon: './assets/icon.png',
        userInterfaceStyle: 'light',
        splash: {
          image: './assets/splash.png',
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
        },
        assetBundlePatterns: ['**/*'],
        ios: {
          supportsTablet: true,
        },
        android: {
          adaptiveIcon: {
            foregroundImage: './assets/adaptive-icon.png',
            backgroundColor: '#ffffff',
          },
        },
        web: {
          favicon: './assets/favicon.png',
        },
        plugins: ['expo-router'],
        scheme: 'my-app',
      },
    };

    const appJsonContent = JSON.stringify(appJson, null, 2) + '\n';
    ctx.addFile('app.json', Buffer.from(appJsonContent, 'utf-8'));

    const eslintConfigJs = `import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  {
    ignores: ['.expo/**', 'node_modules/**', 'dist/**'],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'warn',
    },
  },
];
`;
    ctx.addFile('eslint.config.mjs', Buffer.from(eslintConfigJs, 'utf-8'));

    const appLayout = `import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Home' }} />
    </Stack>
  );
}
`;
    ctx.addFile('app/_layout.tsx', Buffer.from(appLayout, 'utf-8'));

    const appIndex = `import { Text, View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Expo</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});
`;
    ctx.addFile('app/index.tsx', Buffer.from(appIndex, 'utf-8'));

    const jestConfig = `module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};
`;
    ctx.addFile('jest.config.js', Buffer.from(jestConfig, 'utf-8'));

    const jestSetup = `import '@testing-library/jest-native/extend-expect';
`;
    ctx.addFile('jest.setup.js', Buffer.from(jestSetup, 'utf-8'));

    const appIndexTest = `import { render, screen } from '@testing-library/react-native';
import Index from './index';

describe('Index', () => {
  it('renders welcome message', () => {
    render(<Index />);
    expect(screen.getByText('Welcome to Expo')).toBeTruthy();
  });
});
`;
    ctx.addFile('app/index.test.tsx', Buffer.from(appIndexTest, 'utf-8'));

    const latticeVersion = getLatticeVersion();
    const policyVersion = ctx.policy.version;
    const configHash = computeConfigHash(ctx.config);
    
    const cursorRules = `<!--
latticeVersion: ${latticeVersion}
stack: expo-eas
policyVersion: ${policyVersion}
configHash: ${configHash}
-->

# Lattice Bootstrap Cursor Rules - Expo EAS

You are a senior full-stack engineer responsible for production-quality Expo applications.

## Core Operating Rules

- Stay strictly within the scope explicitly defined in the current task.
- Do not invent features, abstractions, or future functionality.
- Do not use placeholders, TODOs, stubs, or mock implementations.
- All code must compile, typecheck, and pass tests.
- Determinism is mandatory: no timestamps, UUIDs, randomness, or network calls.
- Prefer simple, explicit implementations over clever ones.
- Keep changes minimal and localized.

## Expo EAS-Specific Guidelines

### File Structure
- Use Expo Router conventions: \`app/\` directory for routes and screens.
- Place components in \`app/\` or a \`components/\` directory at the root.
- Use \`_layout.tsx\` for navigation layouts, \`index.tsx\` for route screens.
- Follow Expo Router file conventions for nested routing.

### Verification Commands
- \`npm run lint\`: Run ESLint to check code quality.
- \`npm run typecheck\`: Run TypeScript compiler in check mode.
- \`npm test\`: Run Jest tests with React Native Testing Library.
- \`npm run build\`: Not applicable for Expo; use \`eas build\` for production builds.

### Expo EAS Best Practices
- Use React Native components and APIs; avoid web-only APIs.
- Use Expo Router for navigation; leverage file-based routing.
- Use StyleSheet API for styling; prefer StyleSheet.create().
- Leverage Expo SDK modules; avoid native modules unless necessary.
- Use TypeScript strict mode and Expo TypeScript configuration.
- For production builds, use EAS Build: \`eas build --platform ios/android\`.

## Execution Discipline

Before writing code:
- Restate the scope in one paragraph.
- Identify the exact files to be created or modified.

While writing code:
- Follow TypeScript strict mode.
- Use Expo Router and React Native conventions.
- Do not touch the filesystem or network unless explicitly instructed.
- Do not add dependencies unless explicitly required.

After writing code:
- Run \`npm run lint\`, \`npm run typecheck\`, and \`npm test\`.
- If any command fails, stop and fix before proceeding.
- Report verification results.

## Hard Stop Conditions

- If requirements conflict, stop and ask.
- If verification fails, stop and fix.
- If scope is unclear, stop and clarify.

## Non-Goals

- No web UI (unless explicitly requested).
- No GitHub integration.
- No patcher or apply logic unless explicitly requested.
- No SaaS or authentication code.

## Priority Order

1. Correctness
2. Determinism
3. Clarity
4. Maintainability
5. Completeness

Violation of these rules is a failure.
`;
    ctx.addFile('.cursor/rules.md', Buffer.from(cursorRules, 'utf-8'));
  }
}

