import type { Readable } from 'node:stream'

import type { FileSource, OnSuccessPayload, SliceResult, UploadOptions } from 'tus-js-client'

import type { AssemblyStatus } from './alphalib/types/assemblyStatus.ts'
import type { UploadProgress } from './Transloadit.ts'

import { ReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { basename } from 'node:path'

import debug from 'debug'
import pMap from 'p-map'
import { defaultOptions, Upload } from 'tus-js-client'

const log = debug('transloadit')
const logWarn = debug('transloadit:warn')

export type UploadBehavior = 'await' | 'background' | 'none'

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
  uploadBehavior?: UploadBehavior
  onFileStreamOpened?: (stream: ReadStream) => void
  onFileSliceStarted?: (slice: Promise<unknown>) => void
}

interface SendTusRequestResult {
  uploadUrls: Record<string, string>
  uploadsComplete?: Promise<unknown>
}

export async function sendTusRequest({
  streamsMap,
  assembly,
  requestedChunkSize,
  uploadConcurrency,
  onProgress,
  signal,
  uploadUrls,
  uploadBehavior = 'await',
  onFileStreamOpened,
  onFileSliceStarted,
}: SendTusRequestOptions): Promise<SendTusRequestResult> {
  const streamLabels = Object.keys(streamsMap)

  let totalBytes = 0
  let lastEmittedProgress = 0

  const sizes: Record<string, number> = {}
  const uploadUrlsResult: Record<string, string> = { ...(uploadUrls ?? {}) }

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

  const completionPromises: Array<Promise<void>> = []
  const uploadUrlPromises: Array<Promise<void>> = []

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

    if (uploadBehavior === 'none' && uploadUrls?.[label]) {
      uploadUrlsResult[label] = uploadUrls[label]
      uploadUrlPromises.push(Promise.resolve())
      completionPromises.push(Promise.resolve())
      return
    }

    let urlResolved = false
    let resolveUrl: () => void = () => {}
    let rejectUrl: (err: Error) => void = () => {}
    const uploadUrlPromise = new Promise<void>((resolve, reject) => {
      resolveUrl = () => {
        if (urlResolved) return
        urlResolved = true
        resolve()
      }
      rejectUrl = (err) => {
        if (urlResolved) return
        urlResolved = true
        reject(err)
      }
    })

    let resolveCompletion: () => void = () => {}
    let rejectCompletion: (err: Error) => void = () => {}
    const completionPromise = new Promise<void>((resolve, reject) => {
      resolveCompletion = resolve
      rejectCompletion = reject
    })

    // If startPromise rejects first, pMap aborts before sendTusRequest reaches the aggregate awaits
    // below. These bookkeeping promises still need handlers so the startPromise rejection remains
    // the single error surface.
    uploadUrlPromise.catch(() => {})
    completionPromise.catch(() => {})

    uploadUrlPromises.push(uploadUrlPromise)
    completionPromises.push(completionPromise)

    if (uploadUrls?.[label]) {
      uploadUrlsResult[label] = uploadUrls[label]
      resolveUrl()
    }

    const startPromise = new Promise<void>((resolvePromise, rejectPromise) => {
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
      const resolve = (_payload: OnSuccessPayload) => {
        if (abortHandler) signal?.removeEventListener('abort', abortHandler)
        resolveCompletion()
        resolveUrl()
        resolvePromise()
      }
      const reject = (err: unknown) => {
        if (abortHandler) signal?.removeEventListener('abort', abortHandler)
        rejectCompletion(err as Error)
        rejectUrl(err as Error)
        rejectPromise(err)
      }

      let tusUpload: Upload
      const tusOptions: UploadOptions = {
        endpoint: assembly.tus_url,
        uploadUrl: uploadUrls?.[label],
        metadata: {
          assembly_url: assembly.assembly_ssl_url,
          fieldname: label,
          filename,
        },
        onBeforeRequest: () => {
          // Retry progress callbacks can abort after slicing but before the HTTP send.
          if (signal?.aborted) throw new Error('Upload aborted')
        },
        onError: reject,
        onProgress: onTusProgress,
        onSuccess: resolve,
        onUploadUrlAvailable: () => {
          const url = tusUpload?.url
          if (url) {
            uploadUrlsResult[label] = url
          }
          resolveUrl()
          if (uploadBehavior === 'none') {
            tusUpload.abort()
            resolveCompletion()
          }
        },
      }
      if (onFileStreamOpened) {
        // tus opens a separate ReadStream for each chunk; abort() leaves those streams open.
        // Track those chunks even when the original file stream belongs to the caller.
        tusOptions.fileReader = {
          async openFile(input: unknown, chunkSize: number): Promise<FileSource> {
            const source = await defaultOptions.fileReader.openFile(input, chunkSize)
            return {
              size: source.size,
              async slice(start: number, end: number): Promise<SliceResult> {
                if (signal?.aborted) throw new Error('Upload aborted')
                const reading = source.slice(start, end).then((chunk) => {
                  // tus-js-client declares platform-specific chunk values as any.
                  const value: unknown = chunk.value
                  if (value instanceof ReadStream) onFileStreamOpened(value)
                  if (signal?.aborted) throw new Error('Upload aborted')
                  return chunk
                })
                // A file slice can open its stream before the promise resolves.
                if (input instanceof ReadStream && input.path != null) {
                  onFileSliceStarted?.(reading)
                }
                return await reading
              },
              close() {
                source.close()
              },
            }
          },
        }
      }
      // tus-js-client doesn't like undefined/null
      if (size != null) tusOptions.uploadSize = size
      if (chunkSize) tusOptions.chunkSize = chunkSize
      if (uploadLengthDeferred) tusOptions.uploadLengthDeferred = uploadLengthDeferred

      tusUpload = new Upload(stream, tusOptions)

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

    if (uploadBehavior === 'await') {
      await startPromise
      log(label, 'upload done')
      return
    }

    startPromise.catch((err) => {
      logWarn('Background upload failed', err)
    })

    await uploadUrlPromise
    log(label, 'upload started')
  }

  await pMap(streamLabels, uploadSingleStream, { concurrency: uploadConcurrency, signal })

  await Promise.all(uploadUrlPromises)

  const uploadsComplete = Promise.allSettled(completionPromises)
  if (uploadBehavior === 'await') {
    await Promise.all(completionPromises)
  } else {
    uploadsComplete.catch((err) => {
      logWarn('Background upload failed', err)
    })
  }

  return { uploadUrls: uploadUrlsResult, uploadsComplete }
}
