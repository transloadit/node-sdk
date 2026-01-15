import type { GlobOptionsWithoutFileTypes } from 'node:fs'
import * as fs from 'node:fs'
import { glob as fsGlob, stat as statAsync } from 'node:fs/promises'
import path from 'node:path'

type PatternInput = string | readonly string[]
const { globSync: fsGlobSync } = fs

export interface NativeGlobbyOptions {
  cwd?: string
  absolute?: boolean
  onlyFiles?: boolean
  ignore?: readonly string[]
}

interface NormalizedOptions {
  cwd?: string
  absolute: boolean
  onlyFiles: boolean
  ignore?: readonly string[]
}

interface Candidate {
  rawPath: string
  absolutePath: string
}

const normalizeSlashes = (value: string) => value.replace(/\\/g, '/')

const toAbsolutePath = (rawPath: string, cwd?: string): string => {
  if (path.isAbsolute(rawPath)) {
    return rawPath
  }
  if (cwd) {
    return path.join(cwd, rawPath)
  }
  return path.resolve(rawPath)
}

const normalizeOptions = (options: NativeGlobbyOptions = {}): NormalizedOptions => ({
  cwd: options.cwd ? path.resolve(options.cwd) : undefined,
  absolute: options.absolute ?? false,
  onlyFiles: options.onlyFiles ?? true,
  ignore: options.ignore && options.ignore.length > 0 ? options.ignore : undefined,
})

const hasGlobMagic = (pattern: string) => /[*?[\]{}()!]/.test(pattern)

const expandPatternAsync = async (pattern: string, options: NormalizedOptions) => {
  if (hasGlobMagic(pattern)) {
    return [pattern]
  }

  try {
    const absolute = toAbsolutePath(pattern, options.cwd)
    const stats = await statAsync(absolute)
    if (stats.isDirectory()) {
      const expanded = normalizeSlashes(path.join(pattern, '**/*'))
      return [expanded]
    }
  } catch {
    // ignore missing paths; fall back to original pattern
  }

  return [pattern]
}

const expandPatternSync = (pattern: string, options: NormalizedOptions) => {
  if (hasGlobMagic(pattern)) {
    return [pattern]
  }

  try {
    const absolute = toAbsolutePath(pattern, options.cwd)
    const stats = fs.statSync(absolute)
    if (stats.isDirectory()) {
      const expanded = normalizeSlashes(path.join(pattern, '**/*'))
      return [expanded]
    }
  } catch {
    // ignore missing paths; fall back to original pattern
  }

  return [pattern]
}

const splitPatterns = (patterns: PatternInput) => {
  const list = Array.isArray(patterns) ? patterns : [patterns]
  const positive: string[] = []
  const negative: string[] = []

  for (const pattern of list) {
    if (pattern.startsWith('!')) {
      const negated = pattern.slice(1)
      if (negated) {
        negative.push(negated)
      }
    } else {
      positive.push(pattern)
    }
  }

  return { positive, negative }
}

const toGlobOptions = (options: NormalizedOptions): GlobOptionsWithoutFileTypes => {
  const globOptions: GlobOptionsWithoutFileTypes = { withFileTypes: false }
  if (options.cwd) {
    globOptions.cwd = options.cwd
  }
  if (options.ignore) {
    // Node's glob implementation uses `exclude` for ignore patterns
    globOptions.exclude = options.ignore
  }
  return globOptions
}

const filterFilesAsync = async (candidates: Candidate[], requireFiles: boolean) => {
  if (!requireFiles) {
    return candidates
  }

  const filtered = await Promise.all(
    candidates.map(async (candidate) => {
      try {
        const stats = await statAsync(candidate.absolutePath)
        return stats.isFile() ? candidate : null
      } catch {
        return null
      }
    }),
  )

  return filtered.filter(Boolean) as Candidate[]
}

const filterFilesSync = (candidates: Candidate[], requireFiles: boolean) => {
  if (!requireFiles) {
    return candidates
  }

  const filtered: Candidate[] = []
  for (const candidate of candidates) {
    try {
      const stats = fs.statSync(candidate.absolutePath)
      if (stats.isFile()) {
        filtered.push(candidate)
      }
    } catch {
      // Ignore files that cannot be stat'ed
    }
  }
  return filtered
}

const formatResult = (candidate: Candidate, options: NormalizedOptions) => {
  const output = options.absolute ? candidate.absolutePath : candidate.rawPath
  return normalizeSlashes(output)
}

const collectMatchesAsync = async (pattern: string, options: NormalizedOptions) => {
  const matches: Candidate[] = []
  for await (const match of fsGlob(pattern, toGlobOptions(options))) {
    matches.push({
      rawPath: match as string,
      absolutePath: toAbsolutePath(match as string, options.cwd),
    })
  }
  const filtered = await filterFilesAsync(matches, options.onlyFiles)
  return filtered.map((candidate) => formatResult(candidate, options))
}

const collectMatchesSync = (pattern: string, options: NormalizedOptions) => {
  const matches = (fsGlobSync(pattern, toGlobOptions(options)) as string[]).map((match) => ({
    rawPath: match,
    absolutePath: toAbsolutePath(match, options.cwd),
  }))
  const filtered = filterFilesSync(matches, options.onlyFiles)
  return filtered.map((candidate) => formatResult(candidate, options))
}

type GlobbyLike = {
  (patterns: PatternInput, options?: NativeGlobbyOptions): Promise<string[]>
  sync(patterns: PatternInput, options?: NativeGlobbyOptions): string[]
}

export const nativeGlobby: GlobbyLike = Object.assign(
  async (patterns: PatternInput, options?: NativeGlobbyOptions) => {
    const normalized = normalizeOptions(options)
    const { positive, negative } = splitPatterns(patterns)
    const expandedPositives = (
      await Promise.all(positive.map((pattern) => expandPatternAsync(pattern, normalized)))
    ).flat()
    const expandedNegatives = (
      await Promise.all(negative.map((pattern) => expandPatternAsync(pattern, normalized)))
    ).flat()
    const results = new Set<string>()

    for (const pattern of expandedPositives) {
      const matches = await collectMatchesAsync(pattern, normalized)
      for (const match of matches) {
        results.add(match)
      }
    }

    for (const pattern of expandedNegatives) {
      const matches = await collectMatchesAsync(pattern, normalized)
      for (const match of matches) {
        results.delete(match)
      }
    }

    return Array.from(results)
  },
  {
    sync(patterns: PatternInput, options?: NativeGlobbyOptions) {
      const normalized = normalizeOptions(options)
      const { positive, negative } = splitPatterns(patterns)
      const expandedPositives = positive.flatMap((pattern) =>
        expandPatternSync(pattern, normalized),
      )
      const expandedNegatives = negative.flatMap((pattern) =>
        expandPatternSync(pattern, normalized),
      )
      const results = new Set<string>()

      for (const pattern of expandedPositives) {
        const matches = collectMatchesSync(pattern, normalized)
        for (const match of matches) {
          results.add(match)
        }
      }

      for (const pattern of expandedNegatives) {
        const matches = collectMatchesSync(pattern, normalized)
        for (const match of matches) {
          results.delete(match)
        }
      }

      return Array.from(results)
    },
  },
)
