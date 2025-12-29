import type { KnipConfig } from 'knip'

// Note: `yarn check` runs knip with --fix --allow-remove-files. This is safe because
// lint:ts and tests run immediately after - they'll fail if knip removes something needed.
const config: KnipConfig = {
  entry: [
    'src/Transloadit.ts',
    'src/cli.ts',
    'test/**/*.{ts,tsx,js,jsx}',
    'vitest.config.ts',
  ],
  project: ['{src,test}/**/*.{ts,tsx,js,jsx}'],
  ignore: [
    'dist/**',
    'coverage/**',
    'static-build/**',
    'node_modules/**',
    // alphalib is a shared utility library. Exclude it so knip does not remove
    // files that may only be used in other repos.
    'src/alphalib/**',
  ],
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
    'tsx',
  ],
  rules: {
    duplicates: 'warn',
  },
}

export default config
