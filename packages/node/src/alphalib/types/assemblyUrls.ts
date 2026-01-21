import {
  type AssemblyStatus,
  isAssemblyBusyStatus,
  isAssemblyTerminalError,
  isAssemblyTerminalOk,
} from './assemblyStatus.ts'

export const ASSEMBLY_STATUS_COMPLETED = 'ASSEMBLY_COMPLETED' as const
export const ASSEMBLY_STATUS_UPLOADING = 'ASSEMBLY_UPLOADING' as const

export const isAssemblyCompletedStatus = (
  status: string | null | undefined,
): status is typeof ASSEMBLY_STATUS_COMPLETED => status === ASSEMBLY_STATUS_COMPLETED

export const isAssemblyUploadingStatus = (
  status: string | null | undefined,
): status is typeof ASSEMBLY_STATUS_UPLOADING => status === ASSEMBLY_STATUS_UPLOADING

export type AssemblyStage = 'uploading' | 'processing' | 'complete' | 'error'

export const getAssemblyStage = (
  status: AssemblyStatus | null | undefined,
): AssemblyStage | null => {
  if (!status) return null
  const ok = typeof status.ok === 'string' ? status.ok : null
  if (isAssemblyCompletedStatus(ok)) return 'complete'
  if (isAssemblyBusyStatus(ok)) {
    return isAssemblyUploadingStatus(ok) ? 'uploading' : 'processing'
  }
  if (isAssemblyTerminalError(status)) return 'error'
  if (isAssemblyTerminalOk(status)) return 'error'
  return null
}

export type AssemblyUrlFields = {
  tus_url?: string
  tusUrl?: string
  assembly_ssl_url?: string
  assembly_url?: string
  assemblyUrl?: string
}

export type AssemblyUrls = {
  tusUrl: string | null
  assemblyUrl: string | null
}

export type NormalizedAssemblyUrls = {
  tus: { url: string | null }
  assembly: { url: string | null }
}

const tusUrlKeys = ['tus_url', 'tusUrl'] as const
const assemblyUrlKeys = ['assembly_ssl_url', 'assembly_url', 'assemblyUrl'] as const

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const pickString = (
  record: Record<string, unknown>,
  keys: readonly string[],
): string | null => {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.length > 0) return value
  }
  return null
}

export const parseAssemblyUrls = (data: unknown): AssemblyUrls => {
  if (!isRecord(data)) {
    return { tusUrl: null, assemblyUrl: null }
  }

  return {
    tusUrl: pickString(data, tusUrlKeys),
    assemblyUrl: pickString(data, assemblyUrlKeys),
  }
}

export const normalizeAssemblyUploadUrls = (data: unknown): NormalizedAssemblyUrls => {
  const { tusUrl, assemblyUrl } = parseAssemblyUrls(data)
  return {
    tus: { url: tusUrl },
    assembly: { url: assemblyUrl },
  }
}
