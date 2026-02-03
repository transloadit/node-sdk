import { goldenTemplate as encodeHlsVideo001 } from './encode-hls-video/0.0.1.ts'
import type { GoldenTemplate, GoldenTemplateDefinition } from './types.ts'

export type { GoldenTemplate, GoldenTemplateDefinition }

export const goldenTemplates = {
  [encodeHlsVideo001.slug]: encodeHlsVideo001,
} satisfies Record<string, GoldenTemplateDefinition>

const goldenTemplatesByKey: Record<string, GoldenTemplateDefinition> = goldenTemplates

function parseSemver(version: string): [number, number, number] {
  const parts = version.split('.')
  const readPart = (index: number): number => {
    const part = parts[index] ?? ''
    const match = part.match(/^\d+/)
    return match ? Number(match[0]) : 0
  }
  return [readPart(0), readPart(1), readPart(2)]
}

function compareSemver(a: string, b: string): number {
  const [aMajor, aMinor, aPatch] = parseSemver(a)
  const [bMajor, bMinor, bPatch] = parseSemver(b)
  if (aMajor !== bMajor) {
    return aMajor - bMajor
  }
  if (aMinor !== bMinor) {
    return aMinor - bMinor
  }
  if (aPatch !== bPatch) {
    return aPatch - bPatch
  }
  if (a === b) {
    return 0
  }
  return a < b ? -1 : 1
}

function versionFromKey(key: string): string {
  const [, version] = key.split('@')
  return version ?? ''
}

function compareGoldenKeys(a: string, b: string): number {
  return compareSemver(versionFromKey(a), versionFromKey(b))
}

export function resolveGoldenTemplateKey(slug: string): string | null {
  if (slug.includes('@')) {
    return goldenTemplatesByKey[slug] ? slug : null
  }

  const matches = Object.keys(goldenTemplatesByKey).filter((key) => key.startsWith(`${slug}@`))
  if (matches.length === 0) {
    return null
  }

  let latest = matches[0]
  for (const candidate of matches.slice(1)) {
    if (compareGoldenKeys(candidate, latest) > 0) {
      latest = candidate
    }
  }
  return latest
}

export function resolveGoldenTemplate(slug: string): GoldenTemplate | null {
  const key = resolveGoldenTemplateKey(slug)
  return key ? goldenTemplatesByKey[key] : null
}

export function listGoldenTemplateKeys(include: 'latest' | 'all' = 'latest'): string[] {
  const keys = Object.keys(goldenTemplatesByKey)
  if (include === 'all') {
    return keys
  }

  const latestBySlug = new Map<string, string>()
  for (const key of keys) {
    const base = key.split('@')[0]
    const existing = latestBySlug.get(base)
    if (!existing || compareGoldenKeys(key, existing) > 0) {
      latestBySlug.set(base, key)
    }
  }
  return [...latestBySlug.values()]
}
