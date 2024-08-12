import debug = require('debug')
import p = require('path')
import tus = require('tus-js-client')
import fsPromises = require('fs/promises')
import pMap = require('p-map')
import type { Readable } from 'stream'
import type { Assembly, UploadProgress } from './Transloadit'

const log = debug('transloadit')

interface SendTusRequestOptions {
  streamsMap: Record<string, export_.Stream>
  assembly: Assembly
  requestedChunkSize: number
  uploadConcurrency: number
  onProgress: (options: UploadProgress) => void
}

async function sendTusRequest({
  streamsMap,
  assembly,
  requestedChunkSize,
  uploadConcurrency,
  onProgress,
}: SendTusRequestOptions) {
  const streamLabels = Object.keys(streamsMap)

  let totalBytes = 0
  let lastEmittedProgress = 0

  const sizes: Record<string, number> = {}

  const haveUnknownLengthStreams = streamLabels.some((label) => !streamsMap[label].path)

  // Initialize size data
  await pMap(
    streamLabels,
    async (label) => {
      const { path } = streamsMap[label]

      if (path) {
        const { size } = await fsPromises.stat(path)
        sizes[label] = size
        totalBytes += size
      }
    },
    { concurrency: 5 }
  )

  const uploadProgresses: Record<string, number> = {}

  async function uploadSingleStream(label: string) {
    uploadProgresses[label] = 0

    const { stream, path } = streamsMap[label]
    const size = sizes[label]

    let chunkSize = requestedChunkSize
    let uploadLengthDeferred: boolean
    const isStreamLengthKnown = !!path
    if (!isStreamLengthKnown) {
      // tus-js-client requires these options to be set for unknown size streams
      // https://github.com/tus/tus-js-client/blob/master/docs/api.md#uploadlengthdeferred
      uploadLengthDeferred = true
      if (chunkSize === Infinity) chunkSize = 50e6
    }

    const onTusProgress = (bytesUploaded: number): void => {
      uploadProgresses[label] = bytesUploaded

      // get all uploaded bytes for all files
      let uploadedBytes = 0
      for (const l of streamLabels) {
        uploadedBytes += uploadProgresses[l]
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

    const filename = path ? p.basename(path) : label

    await new Promise<void>((resolve, reject) => {
      const tusOptions: tus.UploadOptions = {
        endpoint: assembly.tus_url,
        metadata: {
          assembly_url: assembly.assembly_ssl_url,
          fieldname: label,
          filename,
        },
        uploadSize: size,
        onError: reject,
        onProgress: onTusProgress,
        onSuccess: resolve,
      }
      // tus-js-client doesn't like undefined/null
      if (chunkSize) tusOptions.chunkSize = chunkSize
      if (uploadLengthDeferred) tusOptions.uploadLengthDeferred = uploadLengthDeferred

      const tusUpload = new tus.Upload(stream, tusOptions)

      tusUpload.start()
    })

    log(label, 'upload done')
  }

  await pMap(streamLabels, uploadSingleStream, { concurrency: uploadConcurrency })
}

const export_ = {
  sendTusRequest,
}

namespace export_ {
  export interface Stream {
    path?: string
    stream: Readable
  }
}

export = export_
