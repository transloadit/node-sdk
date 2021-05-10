const log = require('debug')('transloadit')
const sumBy = require('lodash/sumBy')
const { basename } = require('path')
const tus = require('tus-js-client')
const { stat: fsStat } = require('fs').promises
const pMap = require('p-map')

async function sendTusRequest ({ streamsMap, assembly, requestedChunkSize, uploadConcurrency, onProgress }) {
  const streamLabels = Object.keys(streamsMap)

  let totalBytes = 0
  let lastEmittedProgress = 0

  const sizes = {}

  const haveUnknownLengthStreams = streamLabels.some((label) => !streamsMap[label].path)

  // Initialize size data
  await pMap(streamLabels, async (label) => {
    const { path } = streamsMap[label]

    if (path) {
      const { size } = await fsStat(path)
      sizes[label] = size
      totalBytes += size
    }
  }, { concurrency: 5 })

  const uploadProgresses = {}

  async function uploadSingleStream (label) {
    uploadProgresses[label] = 0

    const { stream, path } = streamsMap[label]
    const size = sizes[label]

    let chunkSize = requestedChunkSize
    let uploadLengthDeferred
    const isStreamLengthKnown = !!path
    if (!isStreamLengthKnown) {
      // tus-js-client requires these options to be set for unknown size streams
      // https://github.com/tus/tus-js-client/blob/master/docs/api.md#uploadlengthdeferred
      uploadLengthDeferred = true
      if (chunkSize === Infinity) chunkSize = 5e6
    }

    const onTusProgress = (bytesUploaded) => {
      uploadProgresses[label] = bytesUploaded

      // get all uploaded bytes for all files
      const uploadedBytes = sumBy(streamLabels, (l) => uploadProgresses[l])

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

    await new Promise((resolve, reject) => {
      const tusOptions = {
        endpoint: assembly.tus_url,
        metadata: {
          assembly_url: assembly.assembly_ssl_url,
          fieldname   : label,
          filename,
        },
        uploadSize: size,
        onError   : reject,
        onProgress: onTusProgress,
        onSuccess : resolve,
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

module.exports = {
  sendTusRequest,
}
