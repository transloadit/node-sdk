import type { KnipConfig } from 'knip'

const sharedIgnore = ['dist/**', 'coverage/**', 'static-build/**', 'node_modules/**']
const alphalibIgnore = 'src/alphalib/**'

const config: KnipConfig = {
  rules: {
    // Binary resolution is unreliable with Yarn PnP; avoid false positives.
    binaries: 'off',
    exports: 'warn',
    types: 'warn',
    nsExports: 'warn',
    nsTypes: 'warn',
    duplicates: 'warn',
  },
  ignoreWorkspaces: ['.'],
  ignoreExportsUsedInFile: {
    type: true,
    interface: true,
  },
  workspaces: {
    'packages/node': {
      entry: ['src/Transloadit.ts', 'src/cli.ts', 'test/**/*.{ts,tsx,js,jsx}', 'vitest.config.ts'],
      project: ['{src,test}/**/*.{ts,tsx,js,jsx}'],
      ignore: [...sharedIgnore, alphalibIgnore],
      ignoreDependencies: [
        // Used in src/alphalib/** which is excluded from knip
        '@aws-sdk/client-s3',
        '@aws-sdk/s3-request-presigner',
        '@transloadit/sev-logger',
        'type-fest',
        'zod',
        // Repo-specific ignores
        '@types/minimist',
        'minimatch',
        // Tooling lives at the repo root in this monorepo.
        'vitest',
        'vitest/config',
      ],
    },
    'packages/transloadit': {
      entry: [
        'src/Transloadit.ts',
        'src/cli.ts',
        'src/cli/commands/**/*.ts',
        'src/cli/types.ts',
        'src/tus.ts',
      ],
      project: ['src/**/*.{ts,tsx,js,jsx}'],
      ignore: [...sharedIgnore, alphalibIgnore],
      ignoreDependencies: [
        // Used in src/alphalib/** which is excluded from knip
        '@aws-sdk/client-s3',
        '@aws-sdk/s3-request-presigner',
        '@transloadit/sev-logger',
        'type-fest',
        'zod',
        // Repo-specific ignores
        '@types/minimist',
        'minimatch',
      ],
    },
    'packages/types': {
      entry: ['src/index.ts', 'scripts/emit-types.ts', 'scripts/emit-types.test.ts'],
      project: ['{src,scripts}/**/*.ts'],
      ignore: ['dist/**', 'node_modules/**'],
      ignoreDependencies: [
        // Zod is required for type inspection but not imported directly.
        'zod',
      ],
    },
    'packages/zod': {
      entry: ['src/**/*.{ts,tsx,js,jsx}', 'scripts/**/*.ts', 'test/**/*.ts'],
      project: ['{src,scripts,test}/**/*.ts'],
      ignore: ['dist/**', 'node_modules/**'],
    },
  },
}

export default config
