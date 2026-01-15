// Run this file as:
//
//   env TRANSLOADIT_KEY=xxx TRANSLOADIT_SECRET=yyy yarn tsx examples/face_detect_download.ts ./examples/fixtures/berkley.jpg
//
// You may need to build the project first using:
//
//   yarn prepack
//
// This example will take an image and find a face and crop out the face.
// Then it will download the result as a file in the current directory
// See https://transloadit.com/demos/artificial-intelligence/detect-faces-in-images/

import assert from 'node:assert'
import { createWriteStream } from 'node:fs'
import got from 'got'
import { Transloadit } from 'transloadit'

const { TRANSLOADIT_KEY, TRANSLOADIT_SECRET } = process.env
if (TRANSLOADIT_KEY == null || TRANSLOADIT_SECRET == null) {
  throw new Error('Please set TRANSLOADIT_KEY and TRANSLOADIT_SECRET')
}
const transloadit = new Transloadit({
  authKey: TRANSLOADIT_KEY,
  authSecret: TRANSLOADIT_SECRET,
})

const filePath = process.argv[2]

const status = await transloadit.createAssembly({
  files: {
    file1: filePath,
  },
  params: {
    steps: {
      facesDetected: {
        use: ':original',
        robot: '/image/facedetect',
        crop: true,
        crop_padding: '10%',
        faces: 'max-confidence',
        format: 'preserve',
      },
    },
  },
  waitForCompletion: true,
})

// Now save the file
const outPath = './output-face.jpg'
const stream = createWriteStream(outPath)
const url = status.results?.facesDetected?.[0]?.url
assert(url != null)
got.stream(url).pipe(stream)
console.log('Your cropped face has been saved to', outPath)
