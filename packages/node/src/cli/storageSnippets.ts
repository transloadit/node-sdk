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
  receiptsImport: string
}

function relativeImport(path: string): string {
  return path.startsWith('./') || path.startsWith('../') ? path : `./${path}`
}

/** One catalog-typed Next.js factory for image init. */
export function storageImageFactory({
  prefix,
  privateDelivery = false,
  receiptsImport,
}: StorageImageSnippetOptions): string {
  const catalogImport = `import catalog from ${JSON.stringify(relativeImport(receiptsImport))}`
  if (privateDelivery) {
    return [
      "import { createStorageImages } from '@transloadit/img/next/server'",
      catalogImport,
      '',
      'export const { StorageImage, storageRoute } = createStorageImages({',
      '  ...catalog,',
      `  allowedPathPrefixes: [${JSON.stringify(prefix)}, ...catalog.public],`,
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
    'export const { StorageImage } = createStorageImages(catalog)',
    '',
  ].join('\n')
}

/** An empty-safe scaffold showing the first receipt in the initialized directory. */
export function storageImagePage(receiptsImport: string, prefix: string): string {
  return [
    "import type { TransloaditImageSource } from '@transloadit/img'",
    "import { StorageImage } from '../../lib/storageImage'",
    `import catalog from ${JSON.stringify(relativeImport(receiptsImport))}`,
    '',
    'export default function Page() {',
    '  const images: Record<string, TransloaditImageSource> = catalog.images',
    `  const image = Object.values(images).find((image) => image.path.startsWith(${JSON.stringify(prefix)}))`,
    `  if (image === undefined) return <p>{${JSON.stringify(`Add an image under ${prefix} with transloadit storage store to see it here.`)}}</p>`,
    '  return (',
    '    // Empty alt is decorative; replace it for an informative image.',
    '    <StorageImage src={image} alt="" width={960} priority />',
    '  )',
    '}',
    '',
  ].join('\n')
}

/** Rendering-only variable names; values belong in the application's secret configuration. */
export function storageImageEnvBlock(publicOnly: boolean): string {
  return publicOnly ? '' : 'TRANSLOADIT_KEY=\nTRANSLOADIT_SECRET=\n'
}
