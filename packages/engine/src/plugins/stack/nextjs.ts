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
        lint: 'next lint',
      },
      dependencies: {
        react: '^18.2.0',
        'react-dom': '^18.2.0',
        next: '^14.0.0',
      },
      devDependencies: {
        typescript: '^5.3.3',
        '@types/node': '^20.11.0',
        '@types/react': '^18.2.0',
        '@types/react-dom': '^18.2.0',
        eslint: '^8.56.0',
        'eslint-config-next': '^14.0.0',
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
  }
}

