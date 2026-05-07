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
  ignoreBinaries: ['biome', 'knip', 'npm-run-all', 'tsc', 'vitest'],
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
        // Used in src/alphalib/** which is excluded from Knip's dependency graph.
        '@transloadit/sev-logger',
        // Tooling lives at the repo root in this monorepo.
        'vitest',
        'vitest/config',
      ],
    },
    'packages/mcp-server': {
      entry: ['src/**/*.ts', 'test/**/*.{ts,tsx,js,jsx}'],
      project: ['{src,test}/**/*.{ts,tsx,js,jsx}'],
      ignore: [...sharedIgnore],
      ignoreDependencies: [
        // Tooling lives at the repo root in this monorepo.
        'vitest',
      ],
    },
    'packages/notify-url-relay': {
      entry: ['src/**/*.ts', 'test/**/*.ts', 'vitest.config.ts'],
      project: ['{src,test}/**/*.ts'],
      ignore: [...sharedIgnore],
      ignoreDependencies: [
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
        // Used by generated compatibility package sources that are absent in fresh CI checkouts.
        '@transloadit/sev-logger',
        '@transloadit/utils',
        'cacheable-lookup',
        'clipanion',
        'debug',
        'dotenv',
        'form-data',
        'got',
        'into-stream',
        'is-stream',
        'json-to-ast',
        'lodash-es',
        'node-watch',
        'p-map',
        'p-queue',
        'recursive-readdir',
        'tus-js-client',
        'typanion',
        'type-fest',
        'zod',
        '@types/debug',
        '@types/recursive-readdir',
      ],
    },
    'packages/types': {
      entry: ['src/index.ts', 'scripts/emit-types.ts', 'scripts/emit-types.test.ts'],
      project: ['{src,scripts}/**/*.ts'],
      ignore: ['dist/**', 'node_modules/**'],
    },
    'packages/utils': {
      entry: ['src/**/*.{ts,tsx,js,jsx}'],
      project: ['src/**/*.{ts,tsx,js,jsx}'],
      ignore: ['dist/**', 'node_modules/**'],
    },
    'packages/zod': {
      entry: ['src/**/*.{ts,tsx,js,jsx}', 'scripts/**/*.ts', 'test/**/*.ts'],
      project: ['{src,scripts,test}/**/*.ts'],
      ignore: ['dist/**', 'node_modules/**'],
      ignoreDependencies: [
        // Generated code uses this after sync, but sources don't import it directly.
        'type-fest',
      ],
    },
  },
}

export default config
