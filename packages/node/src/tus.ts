import { stat } from 'node:fs/promises'
import { basename } from 'node:path'
import type { Readable } from 'node:stream'
import debug from 'debug'
import pMap from 'p-map'
import type { OnSuccessPayload, UploadOptions } from 'tus-js-client'
import { Upload } from 'tus-js-client'
import type { AssemblyStatus } from './alphalib/types/assemblyStatus.ts'
import type { UploadProgress } from './Transloadit.ts'

const log = debug('transloadit')

export interface Stream {
  path?: string
  stream: Readable
}

interface SendTusRequestOptions {
  streamsMap: Record<string, Stream>
  assembly: AssemblyStatus
  requestedChunkSize: number
  uploadConcurrency: number
  onProgress: (options: UploadProgress) => void
  signal?: AbortSignal
  uploadUrls?: Record<string, string>
}

export async function sendTusRequest({
  streamsMap,
  assembly,
  requestedChunkSize,
  uploadConcurrency,
  onProgress,
  signal,
  uploadUrls,
}: SendTusRequestOptions) {
  const streamLabels = Object.keys(streamsMap)

  let totalBytes = 0
  let lastEmittedProgress = 0

  const sizes: Record<string, number> = {}

  const haveUnknownLengthStreams = streamLabels.some((label) => !streamsMap[label]?.path)

  // Initialize size data
  await pMap(
    streamLabels,
    async (label) => {
      // Check if aborted before each operation
      if (signal?.aborted) throw new Error('Upload aborted')

      const streamInfo = streamsMap[label]
      if (!streamInfo) {
        throw new Error(`Stream info not found for label: ${label}`)
      }
      const { path } = streamInfo

      if (path) {
        const { size } = await stat(path)
        sizes[label] = size
        totalBytes += size
      }
    },
    { concurrency: 5, signal },
  )

  const uploadProgresses: Record<string, number> = {}

  async function uploadSingleStream(label: string) {
    uploadProgresses[label] = 0

    const streamInfo = streamsMap[label]
    if (!streamInfo) {
      throw new Error(`Stream info not found for label: ${label}`)
    }
    const { stream, path } = streamInfo
    const size = sizes[label]

    let chunkSize = requestedChunkSize
    let uploadLengthDeferred: boolean
    const isStreamLengthKnown = !!path
    if (!isStreamLengthKnown) {
      // tus-js-client requires these options to be set for unknown size streams
      // https://github.com/tus/tus-js-client/blob/master/docs/api.md#uploadlengthdeferred
      uploadLengthDeferred = true
      if (chunkSize === Number.POSITIVE_INFINITY) chunkSize = 50e6
    }

    const onTusProgress = (bytesUploaded: number): void => {
      uploadProgresses[label] = bytesUploaded

      // get all uploaded bytes for all files
      let uploadedBytes = 0
      for (const l of streamLabels) {
        uploadedBytes += uploadProgresses[l] ?? 0
      }

      // don't send redundant progress
      if (lastEmittedProgress < uploadedBytes) {
        lastEmittedProgress = uploadedBytes
        // If we have any unknown length streams, we cannot trust totalBytes
        // totalBytes should then be undefined to mimic behavior of form uploads.
        onProgress({
          uploadedBytes,
          totalBytes: haveUnknownLengthStreams ? undefined : totalBytes,
        })
      }
    }

    const filename = path ? basename(path) : label

    await new Promise<OnSuccessPayload>((resolvePromise, rejectPromise) => {
      if (!assembly.assembly_ssl_url) {
        rejectPromise(new Error('assembly_ssl_url is not present in the assembly status'))
        return
      }

      // Check if already aborted before starting
      if (signal?.aborted) {
        rejectPromise(new Error('Upload aborted'))
        return
      }

      // Wrap resolve/reject to clean up abort listener
      let abortHandler: (() => void) | undefined
      const resolve = (payload: OnSuccessPayload) => {
        if (abortHandler) signal?.removeEventListener('abort', abortHandler)
        resolvePromise(payload)
      }
      const reject = (err: unknown) => {
        if (abortHandler) signal?.removeEventListener('abort', abortHandler)
        rejectPromise(err)
      }

      const tusOptions: UploadOptions = {
        endpoint: assembly.tus_url,
        uploadUrl: uploadUrls?.[label],
        metadata: {
          assembly_url: assembly.assembly_ssl_url,
          fieldname: label,
          filename,
        },
        onError: reject,
        onProgress: onTusProgress,
        onSuccess: resolve,
      }
      // tus-js-client doesn't like undefined/null
      if (size != null) tusOptions.uploadSize = size
      if (chunkSize) tusOptions.chunkSize = chunkSize
      if (uploadLengthDeferred) tusOptions.uploadLengthDeferred = uploadLengthDeferred

      const tusUpload = new Upload(stream, tusOptions)

      // Handle abort signal
      if (signal) {
        abortHandler = () => {
          tusUpload.abort()
          reject(new Error('Upload aborted'))
        }
        signal.addEventListener('abort', abortHandler, { once: true })
      }

      tusUpload.start()
    })

    log(label, 'upload done')
  }

  await pMap(streamLabels, uploadSingleStream, { concurrency: uploadConcurrency, signal })
}
