export interface AssemblyResultEntryLike {
  basename?: unknown
  ext?: unknown
  name?: unknown
  ssl_url?: unknown
  url?: unknown
}

export interface NormalizedAssemblyResultFile {
  file: AssemblyResultEntryLike
  name: string
  stepName: string
  url: string
}

export interface NormalizedAssemblyResults {
  allFiles: NormalizedAssemblyResultFile[]
  entries: Array<[string, Array<AssemblyResultEntryLike>]>
}

function isAssemblyResultEntryLike(value: unknown): value is AssemblyResultEntryLike {
  return value != null && typeof value === 'object'
}

function normalizeAssemblyResultName(
  stepName: string,
  file: AssemblyResultEntryLike,
): string | null {
  if (typeof file.name === 'string') {
    return file.name
  }

  if (typeof file.basename === 'string') {
    if (typeof file.ext === 'string' && file.ext.length > 0) {
      return `${file.basename}.${file.ext}`
    }

    return file.basename
  }

  return `${stepName}_result`
}

function normalizeAssemblyResultUrl(file: AssemblyResultEntryLike): string | null {
  if (typeof file.ssl_url === 'string') {
    return file.ssl_url
  }

  if (typeof file.url === 'string') {
    return file.url
  }

  return null
}

export function normalizeAssemblyResultFile(
  stepName: string,
  value: unknown,
): NormalizedAssemblyResultFile | null {
  if (!isAssemblyResultEntryLike(value)) {
    return null
  }

  const url = normalizeAssemblyResultUrl(value)
  const name = normalizeAssemblyResultName(stepName, value)
  if (url == null || name == null) {
    return null
  }

  return {
    file: value,
    name,
    stepName,
    url,
  }
}

export function normalizeAssemblyResults(results: unknown): NormalizedAssemblyResults {
  if (results == null || typeof results !== 'object' || Array.isArray(results)) {
    return {
      allFiles: [],
      entries: [],
    }
  }

  const files: NormalizedAssemblyResultFile[] = []
  const entries = Object.entries(results)
  for (const [stepName, stepResults] of entries) {
    if (!Array.isArray(stepResults)) {
      continue
    }

    for (const stepResult of stepResults) {
      const normalized = normalizeAssemblyResultFile(stepName, stepResult)
      if (normalized != null) {
        files.push(normalized)
      }
    }
  }

  return {
    allFiles: files,
    entries,
  }
}
