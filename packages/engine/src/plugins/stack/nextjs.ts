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
  }
}

