import { statSync } from 'node:fs'

/** Locate ordinary Next.js app directories without assuming the consumer's source layout. */
export function nextAppRoot(): '' | 'src/' | undefined {
  if (statSync('app', { throwIfNoEntry: false })?.isDirectory()) return ''
  if (statSync('src/app', { throwIfNoEntry: false })?.isDirectory()) return 'src/'
  return undefined
}

interface StorageImageSnippetOptions {
  prefix: string
  privateDelivery?: boolean
  publicDelivery?: boolean
  receiptsImport: string
}

function relativeImport(path: string): string {
  return path.startsWith('./') || path.startsWith('../') ? path : `./${path}`
}

/** One catalog-typed Next.js factory, shared by storage store and image init. */
export function storageImageFactory({
  prefix,
  privateDelivery = false,
  publicDelivery = false,
  receiptsImport,
}: StorageImageSnippetOptions): string {
  const catalogImport = `import images from ${JSON.stringify(relativeImport(receiptsImport))}`
  if (privateDelivery) {
    return [
      "import { createPrivateStorageImages } from '@transloadit/img/next/server'",
      catalogImport,
      '',
      'export const { StorageImage, storageRoute } = createPrivateStorageImages({',
      '  images,',
      `  allowedPathPrefixes: [${JSON.stringify(prefix)}],`,
      '  // Replace with your application session and per-object authorization.',
      '  authorize: () => false,',
      '})',
      '',
    ].join('\n')
  }
  return [
    "import { createStorageImages } from '@transloadit/img/next/server'",
    catalogImport,
    '',
    'export const { StorageImage } = createStorageImages({',
    '  images,',
    `  allowedPathPrefixes: [${JSON.stringify(prefix)}],`,
    ...(publicDelivery ? [`  public: [${JSON.stringify(prefix)}],`] : []),
    '})',
    '',
  ].join('\n')
}

/** Prints a complete receipt-consuming page using ordinary Next.js imports. */
export function storageImagePage(path: string): string {
  return [
    "import { StorageImage } from '../lib/storageImage'",
    '',
    'export default function Page() {',
    '  return (',
    `    <StorageImage src={${JSON.stringify(path)}} alt="Describe this image" layout="constrained" maxWidth={960} preload />`,
    '  )',
    '}',
    '',
  ].join('\n')
}

/** Rendering-only variable names; values belong in the application's secret configuration. */
export const storageImageEnvBlock =
  'TRANSLOADIT_WORKSPACE=\nTRANSLOADIT_SMART_CDN_KEY=\nTRANSLOADIT_SMART_CDN_SECRET=\n'
