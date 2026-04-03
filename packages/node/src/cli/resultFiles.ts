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

export function flattenAssemblyResultFiles(results: unknown): NormalizedAssemblyResultFile[] {
  if (results == null || typeof results !== 'object' || Array.isArray(results)) {
    return []
  }

  const files: NormalizedAssemblyResultFile[] = []
  for (const [stepName, stepResults] of Object.entries(results)) {
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

  return files
}
