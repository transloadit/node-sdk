import { statSync } from 'node:fs'

/** Locate ordinary Next.js app directories without assuming the consumer's source layout. */
export function nextAppRoot(): '' | 'src/' | undefined {
  if (statSync('app', { throwIfNoEntry: false })?.isDirectory()) return ''
  if (statSync('src/app', { throwIfNoEntry: false })?.isDirectory()) return 'src/'
  return undefined
}

/** One copy-pasteable Next.js factory, shared by storage store and image init. */
export function storageImageFactory(prefix: string, privateDelivery = false): string {
  if (privateDelivery) {
    return [
      "import { createPrivateStorageImages } from '@transloadit/img/next/server'",
      '',
      'export const { StorageImage, storageRoute } = createPrivateStorageImages({',
      `  allowedPathPrefixes: [${JSON.stringify(prefix)}],`,
      '  // Replace with your application session and per-object authorization.',
      '  authorize: () => false,',
      '})',
      '',
    ].join('\n')
  }
  return [
    "import { createTransloaditImageFromEnv } from '@transloadit/img/next/server'",
    '',
    'export const { StorageImage } = createTransloaditImageFromEnv({',
    '  storage: {',
    `    allowedPathPrefixes: [${JSON.stringify(prefix)}],`,
    "    delivery: 'direct',",
    '  },',
    '})',
    '',
  ].join('\n')
}

/** Prints a complete receipt-consuming page using ordinary Next.js imports. */
export function storageImagePage(path: string, receiptsImport: string): string {
  return [
    "import { StorageImage } from '../lib/storageImage'",
    `import images from ${JSON.stringify(receiptsImport.startsWith('./') || receiptsImport.startsWith('../') ? receiptsImport : `./${receiptsImport}`)}`,
    '',
    'export default function Page() {',
    '  return (',
    `    <StorageImage src={images[${JSON.stringify(path)}]} alt="Describe this image" preload />`,
    '  )',
    '}',
    '',
  ].join('\n')
}

/** Rendering-only variable names; values belong in the application's secret configuration. */
export const storageImageEnvBlock =
  'TRANSLOADIT_WORKSPACE=\nTRANSLOADIT_SMART_CDN_KEY=\nTRANSLOADIT_SMART_CDN_SECRET=\n'
