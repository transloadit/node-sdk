import { statSync } from 'node:fs'

import { quoteCliArgument } from './helpers.ts'
import { defaultStorageCatalog } from './storageReceipts.ts'

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
  endpoint?: string
}

function relativeImport(path: string): string {
  return path.startsWith('./') || path.startsWith('../') ? path : `./${path}`
}

function sourceString(value: string): string {
  return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'").replaceAll('\n', '\\n').replaceAll('\r', '\\r').replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029')}'`
}

/** One catalog-typed Next.js factory for image init. */
export function storageImageFactory({
  prefix,
  privateDelivery = false,
  receiptsImport,
  endpoint,
}: StorageImageSnippetOptions): string {
  const catalogImport = `import catalog from ${sourceString(relativeImport(receiptsImport))}`
  const delivery =
    endpoint === undefined
      ? []
      : [
          '  // non-production API selected at login; remove for Smart CDN delivery',
          `  baseUrl: ${sourceString(`${new URL(endpoint).origin}/file/{workspace}`)},`,
          "  urlParams: { cdn: 'required' },",
        ]
  if (privateDelivery) {
    return [
      "import { createStorageImages } from '@transloadit/img/next/server'",
      catalogImport,
      '',
      'export const { StorageImage, storageRoute } = createStorageImages({',
      '  ...catalog,',
      ...delivery,
      `  allowedPathPrefixes: [${sourceString(prefix)}, ...catalog.public],`,
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
    ...(delivery.length === 0
      ? ['export const { StorageImage } = createStorageImages(catalog)']
      : [
          'export const { StorageImage } = createStorageImages({',
          '  ...catalog,',
          ...delivery,
          '})',
        ]),
    '',
  ].join('\n')
}

/** An empty-safe scaffold showing the first receipt in the initialized directory. */
export function storageImagePage(
  receiptsImport: string,
  prefix: string,
  receipts = defaultStorageCatalog,
): string {
  const catalogOption =
    receipts === defaultStorageCatalog ? '' : ` --receipts=${quoteCliArgument(receipts)}`
  const command = `npx transloadit storage store${catalogOption}${prefix.startsWith('-') ? ' --' : ''} ./hero.jpg ${quoteCliArgument(`${prefix}hero.jpg`)}`
  return [
    "import { StorageImage } from '../../lib/storageImage'",
    `import catalog from ${sourceString(relativeImport(receiptsImport))}`,
    '',
    'export default function Page() {',
    `  const path = Object.keys(catalog.images).find((path) => path.startsWith(${sourceString(prefix)}))`,
    '  if (path === undefined)',
    '    return (',
    '      <p>',
    `        Run <code>{${sourceString(command)}}</code> to add your`,
    '        first image.',
    '      </p>',
    '    )',
    '  // Object.keys only returns own catalog keys, including when the catalog is still empty.',
    '  const src = path as keyof typeof catalog.images',
    '  const alt = path',
    "    .slice(path.lastIndexOf('/') + 1)",
    "    .replace(/\\.[^.]+$/, '')",
    "    .replaceAll(/[-_]+/g, ' ')",
    '  return (',
    '    <StorageImage',
    '      src={src}',
    '      alt={alt}',
    '      width={960}',
    '      preload',
    '      errorFallback={',
    '        <p role="status">',
    '          This image could not be loaded. Check the Storage path and delivery configuration.',
    '        </p>',
    '      }',
    '    />',
    '  )',
    '}',
    '',
  ].join('\n')
}

/** Rendering-only variable names; values belong in the application's secret configuration. */
export function storageImageEnvBlock(publicOnly: boolean): string {
  return publicOnly ? '' : 'TRANSLOADIT_KEY=\nTRANSLOADIT_SECRET=\n'
}
