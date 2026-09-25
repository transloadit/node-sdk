import type { SmartCdnUrlParams } from '@transloadit/utils'

import { isVersionedStorageTemplate } from './index.ts'

/** Preserve the pinned Built-ins’ canonical query spelling and existing CDN cache keys. */
export function previewUrlParams(
  template: string,
  parameters: SmartCdnUrlParams,
): SmartCdnUrlParams {
  // These exact versions share API2's defaults. Customer templates (and future Built-ins) may not.
  if (!isVersionedStorageTemplate(template)) return parameters
  const allowed = new Set(['bg', 'f', 'q', 'r', 'w', 'h', 'v', 'cdn'])
  for (const name of Object.keys(parameters)) {
    if (!allowed.has(name))
      throw new TypeError(
        `urlParams parameter ${name} is not supported by the selected Storage Built-in`,
      )
  }
  const defaults: Readonly<Record<string, string | number>> = {
    bg: '#ffffff',
    f: 'jpg',
    q: 75,
    r: 'pad',
  }
  return Object.fromEntries(
    Object.entries(parameters).filter(
      ([name, value]) => !Object.hasOwn(defaults, name) || defaults[name] !== value,
    ),
  )
}
