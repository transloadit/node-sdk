import path from 'node:path'

import { z } from 'zod'

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

const bunnyStorageFileEntrySchema = z
  .object({
    DateCreated: z.string().optional(),
    IsDirectory: z.boolean().optional(),
    LastChanged: z.string().optional(),
    Length: z.number().optional(),
    ObjectName: z.string().optional(),
    Path: z.string().optional(),
    StorageZoneName: z.string().optional(),
  })
  .passthrough()

const bunnyStorageZoneDetailsSchema = z
  .object({
    Id: z.number(),
    Name: z.string().nullable(),
    Password: z.string().nullable(),
    Region: z.string().nullable(),
    StorageHostname: z.string().nullable().optional(),
  })
  .passthrough()

const bunnyStorageZoneListSchema = z.union([
  z.array(bunnyStorageZoneDetailsSchema),
  z
    .object({
      Items: z.array(bunnyStorageZoneDetailsSchema).optional(),
    })
    .passthrough(),
])

const bunnyPullZoneDetailsSchema = z
  .object({
    Id: z.number(),
    MonthlyCharges: z.number().nullable().optional(),
    Name: z.string().nullable(),
  })
  .passthrough()

const bunnyStatisticsResponseSchema = z
  .object({
    CacheHitRate: z.number().nullable().optional(),
    TotalBandwidthUsed: z.number().nullable().optional(),
    TotalOriginTraffic: z.number().nullable().optional(),
    TotalRequestsServed: z.number().nullable().optional(),
  })
  .passthrough()

const bunnyStorageFileEntriesSchema = z.array(bunnyStorageFileEntrySchema)

export type BunnyStorageFileEntry = z.infer<typeof bunnyStorageFileEntrySchema>
export type BunnyStorageZoneDetails = z.infer<typeof bunnyStorageZoneDetailsSchema>
export type BunnyPullZoneDetails = z.infer<typeof bunnyPullZoneDetailsSchema>
export type BunnyStatisticsResponse = z.infer<typeof bunnyStatisticsResponseSchema>

export interface BunnyLoggingApiExportResult {
  logUrl: string
  response: Response
}

export interface BunnyClientLogger {
  notice(message: string, ...args: unknown[]): void
}

export class BunnyClient {
  apiKey: string
  logger: BunnyClientLogger

  constructor(opts: { apiKey: string; logger: BunnyClientLogger }) {
    this.apiKey = opts.apiKey
    this.logger = opts.logger
  }

  async getStorageZoneDetailsByName(name: string): Promise<BunnyStorageZoneDetails> {
    const listResponse = await fetch('https://api.bunny.net/storagezone', {
      headers: {
        AccessKey: this.apiKey,
      },
    })
    if (!listResponse.ok) {
      throw new Error(`Failed to list Bunny storage zones: ${listResponse.status}`)
    }

    const listJson = bunnyStorageZoneListSchema.parse(await listResponse.json())
    const storageZones = Array.isArray(listJson) ? listJson : (listJson.Items ?? [])
    const storageZone = storageZones.find((item) => item.Name === name)
    if (!storageZone?.Id) {
      throw new Error(`Could not find Bunny storage zone '${name}'`)
    }

    const detailsResponse = await fetch(`https://api.bunny.net/storagezone/${storageZone.Id}`, {
      headers: {
        AccessKey: this.apiKey,
      },
    })
    if (!detailsResponse.ok) {
      throw new Error(
        `Failed to fetch Bunny storage zone '${name}' details: ${detailsResponse.status}`,
      )
    }

    const details = bunnyStorageZoneDetailsSchema.parse(await detailsResponse.json())
    if (!details.Name || !details.Password || !details.Region) {
      throw new Error(`Incomplete Bunny storage zone details for '${name}'`)
    }

    return details
  }

  async getPullZoneDetailsById(pullZoneId: number): Promise<BunnyPullZoneDetails> {
    const response = await fetch(`https://api.bunny.net/pullzone/${pullZoneId}`, {
      headers: {
        AccessKey: this.apiKey,
      },
    })
    if (!response.ok) {
      throw new Error(`Failed to fetch Bunny pull zone '${pullZoneId}': ${response.status}`)
    }

    return bunnyPullZoneDetailsSchema.parse(await response.json())
  }

  async getStatistics({
    dateFrom,
    dateTo,
    pullZoneId,
  }: {
    dateFrom: string
    dateTo: string
    pullZoneId: number
  }): Promise<BunnyStatisticsResponse> {
    const query = new URLSearchParams({
      dateFrom,
      dateTo,
      loadBandwidthUsed: 'true',
      loadOriginTraffic: 'true',
      loadRequestsServed: 'true',
      pullZone: `${pullZoneId}`,
    })
    const response = await fetch(`https://api.bunny.net/statistics?${query.toString()}`, {
      headers: {
        AccessKey: this.apiKey,
      },
    })
    if (!response.ok) {
      throw new Error(`Failed to fetch Bunny statistics: ${response.status}`)
    }

    return bunnyStatisticsResponseSchema.parse(await response.json())
  }

  async listStorageFilesRecursive(
    storageZone: BunnyStorageZoneDetails,
    currentPath = '',
  ): Promise<BunnyStorageFileEntry[]> {
    const encodedPath = this._encodeStoragePath(currentPath)
    const storageBaseUrl = this._getStorageApiBaseUrl(storageZone)
    const slashSuffix = encodedPath ? `${encodedPath}/` : ''
    const listUrl = `${storageBaseUrl}/${storageZone.Name}/${slashSuffix}`
    const response = await fetch(listUrl, {
      headers: {
        AccessKey: storageZone.Password as string,
      },
    })
    if (!response.ok) {
      throw new Error(`Failed to list Bunny storage path '${currentPath}': ${response.status}`)
    }

    const entries = bunnyStorageFileEntriesSchema.parse(await response.json())
    const files: BunnyStorageFileEntry[] = []

    for (const entry of entries) {
      const entryName = entry.ObjectName || ''
      const nextPath = this._normalizeStoragePath(path.posix.join(currentPath, entryName))
      if (entry.IsDirectory) {
        files.push(...(await this.listStorageFilesRecursive(storageZone, nextPath)))
        continue
      }

      files.push({
        ...entry,
        Path: nextPath,
      })
    }

    return files
  }

  async downloadStorageFile(
    storageZone: BunnyStorageZoneDetails,
    storagePath: string,
  ): Promise<Response> {
    const storageBaseUrl = this._getStorageApiBaseUrl(storageZone)
    const normalizedPath = this._normalizeStoragePath(storagePath)
    const sourceUrl = `${storageBaseUrl}/${storageZone.Name}/${this._encodeStoragePath(normalizedPath)}`
    const response = await fetch(sourceUrl, {
      headers: {
        AccessKey: storageZone.Password as string,
      },
    })
    if (!response.ok) {
      throw new Error(`Failed to download Bunny log '${normalizedPath}': ${response.status}`)
    }

    return response
  }

  async fetchLoggingApiExport({
    apiDate,
    pullZoneId,
  }: {
    apiDate: string
    pullZoneId: number
  }): Promise<BunnyLoggingApiExportResult> {
    const logUrl = `https://logging.bunnycdn.com/${apiDate}/${pullZoneId}.log`

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const response = await fetch(logUrl, {
        headers: {
          AccessKey: this.apiKey,
        },
      })
      if (response.status !== 429) {
        return { logUrl, response }
      }

      if (attempt === 3) {
        return { logUrl, response }
      }

      const retryAfterSeconds = Number(response.headers.get('retry-after') || '')
      const waitMs =
        Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
          ? retryAfterSeconds * 1000
          : attempt * 1000
      this.logger.notice(
        '--> Bunny Logging API rate limited for %s, retrying in %sms',
        apiDate,
        waitMs,
      )
      await wait(waitMs)
    }

    throw new Error(`Unreachable Bunny Logging API retry flow for '${apiDate}'`)
  }

  _getStorageApiBaseUrl(storageZone: BunnyStorageZoneDetails): string {
    if (storageZone.StorageHostname) {
      return `https://${storageZone.StorageHostname}`
    }

    const region = (storageZone.Region || '').toUpperCase()
    switch (region) {
      case 'DE':
        return 'https://storage.bunnycdn.com'
      case 'UK':
        return 'https://uk.storage.bunnycdn.com'
      case 'NY':
        return 'https://ny.storage.bunnycdn.com'
      case 'LA':
        return 'https://la.storage.bunnycdn.com'
      case 'SG':
        return 'https://sg.storage.bunnycdn.com'
      case 'SE':
        return 'https://se.storage.bunnycdn.com'
      case 'BR':
        return 'https://br.storage.bunnycdn.com'
      case 'JH':
      case 'ZA':
        return 'https://jh.storage.bunnycdn.com'
      case 'SYD':
      case 'AU':
        return 'https://syd.storage.bunnycdn.com'
      default:
        throw new Error(`Unsupported Bunny storage region '${storageZone.Region}'`)
    }
  }

  _encodeStoragePath(storagePath: string): string {
    return storagePath
      .split('/')
      .filter(Boolean)
      .map((part) => encodeURIComponent(part))
      .join('/')
  }

  _normalizeStoragePath(storagePath: string): string {
    return storagePath.replace(/^\/+/, '').replace(/\/+/g, '/')
  }
}
