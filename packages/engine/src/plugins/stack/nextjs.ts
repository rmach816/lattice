import type { Plugin, PluginId, PluginPhase, ConflictPolicy } from '../../plugin';
import type { ProjectConfig } from '../../config';
import type { GeneratorContext } from '../../context';

export class NextJsPlugin implements Plugin {
  id: PluginId = 'stack/nextjs';
  version = '0.1.0';
  phase: PluginPhase = 'render';
  conflictPolicy: ConflictPolicy = 'error';

  appliesTo(config: ProjectConfig): boolean {
    return config.projectType === 'nextjs';
  }

  apply(ctx: GeneratorContext): void {
    if (ctx.hasFile('package.json')) {
      throw new Error('package.json already exists');
    }

    const packageJson = {
      name: 'my-app',
      version: '0.1.0',
      private: true,
      scripts: {
        dev: 'next dev',
        build: 'next build',
        start: 'next start',
        lint: 'eslint .',
        typecheck: 'tsc --noEmit',
        test: 'jest',
      },
      dependencies: {
        react: '^19.2.1',
        'react-dom': '^19.2.1',
        next: '^16.1.0',
      },
      devDependencies: {
        typescript: '^5.9.0',
        '@types/node': '^20.11.0',
        '@types/react': '^19.0.0',
        '@types/react-dom': '^19.0.0',
        eslint: '^9.0.0',
        '@typescript-eslint/parser': '^8.0.0',
        '@typescript-eslint/eslint-plugin': '^8.0.0',
        jest: '^29.7.0',
        '@types/jest': '^29.5.11',
        'ts-jest': '^29.1.1',
        '@testing-library/react': '^16.0.0',
        '@testing-library/jest-dom': '^6.1.5',
        'jest-environment-jsdom': '^29.7.0',
      },
    };

    const packageJsonContent = JSON.stringify(packageJson, null, 2) + '\n';
    ctx.addFile('package.json', Buffer.from(packageJsonContent, 'utf-8'));

    const tsconfigJson = {
      compilerOptions: {
        target: 'ES2022',
        lib: ['dom', 'dom.iterable', 'esnext'],
        allowJs: true,
        skipLibCheck: true,
        strict: true,
        noEmit: true,
        esModuleInterop: true,
        module: 'esnext',
        moduleResolution: 'bundler',
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: 'preserve',
        incremental: true,
        plugins: [
          {
            name: 'next',
          },
        ],
        paths: {
          '@/*': ['./*'],
        },
      },
      include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
      exclude: ['node_modules'],
    };

    const tsconfigContent = JSON.stringify(tsconfigJson, null, 2) + '\n';
    ctx.addFile('tsconfig.json', Buffer.from(tsconfigContent, 'utf-8'));

    const nextConfigJs = `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = nextConfig;
`;
    ctx.addFile('next.config.js', Buffer.from(nextConfigJs, 'utf-8'));

    const eslintConfigJs = `import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  {
    ignores: ['.next/**', 'node_modules/**', 'out/**', 'dist/**'],
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

    const appLayout = `export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`;
    ctx.addFile('app/layout.tsx', Buffer.from(appLayout, 'utf-8'));

    const appPage = `export default function Home() {
  return (
    <main>
      <h1>Welcome to Next.js</h1>
    </main>
  );
}
`;
    ctx.addFile('app/page.tsx', Buffer.from(appPage, 'utf-8'));

    const jestConfig = `const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};

module.exports = createJestConfig(customJestConfig);
`;
    ctx.addFile('jest.config.js', Buffer.from(jestConfig, 'utf-8'));

    const jestSetup = `import '@testing-library/jest-dom';
`;
    ctx.addFile('jest.setup.js', Buffer.from(jestSetup, 'utf-8'));

    const appPageTest = `import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Home from './page';

describe('Home', () => {
  it('renders welcome message', () => {
    render(<Home />);
    expect(screen.getByText('Welcome to Next.js')).toBeInTheDocument();
  });
});
`;
    ctx.addFile('app/page.test.tsx', Buffer.from(appPageTest, 'utf-8'));

    const cursorRules = `# Lattice Bootstrap Cursor Rules - Next.js

You are a senior full-stack engineer responsible for production-quality Next.js applications.

## Core Operating Rules

- Stay strictly within the scope explicitly defined in the current task.
- Do not invent features, abstractions, or future functionality.
- Do not use placeholders, TODOs, stubs, or mock implementations.
- All code must compile, typecheck, and pass tests.
- Determinism is mandatory: no timestamps, UUIDs, randomness, or network calls.
- Prefer simple, explicit implementations over clever ones.
- Keep changes minimal and localized.

## Next.js-Specific Guidelines

### File Structure
- Use App Router conventions: \`app/\` directory for routes, layouts, and pages.
- Place components in \`app/\` or a \`components/\` directory at the root.
- Use \`layout.tsx\` for shared layouts, \`page.tsx\` for route pages.
- Follow Next.js file conventions: \`loading.tsx\`, \`error.tsx\`, \`not-found.tsx\`.

### Verification Commands
- \`npm run lint\`: Run ESLint to check code quality.
- \`npm run typecheck\`: Run TypeScript compiler in check mode.
- \`npm test\`: Run Jest tests with React Testing Library.
- \`npm run build\`: Build the Next.js application for production.

### Next.js Best Practices
- Use Server Components by default; add \`"use client"\` only when needed.
- Prefer async Server Components for data fetching.
- Use Next.js built-in routing; avoid custom routing solutions.
- Leverage Next.js Image component for optimized images.
- Use TypeScript strict mode and Next.js TypeScript configuration.

## Execution Discipline

Before writing code:
- Restate the scope in one paragraph.
- Identify the exact files to be created or modified.

While writing code:
- Follow TypeScript strict mode.
- Use Next.js App Router conventions.
- Do not touch the filesystem or network unless explicitly instructed.
- Do not add dependencies unless explicitly required.

After writing code:
- Run \`npm run lint\`, \`npm run typecheck\`, \`npm test\`, and \`npm run build\`.
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

