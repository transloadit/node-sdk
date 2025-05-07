// Run this file as:
//
//   env TRANSLOADIT_KEY=xxx TRANSLOADIT_SECRET=yyy node examples/face_detect_download.js ./examples/fixtures/berkley.jpg
//
// You may need to build the project first using:
//
//   yarn prepack
//
// This example will take an image and find a face and crop out the face.
// Then it will download the result as a file in the current directory
// See https://transloadit.com/demos/artificial-intelligence/detect-faces-in-images/

import got from 'got'
import { createWriteStream } from 'node:fs'
import { Transloadit } from 'transloadit'
import assert from 'assert'

const transloadit = new Transloadit({
  authKey: process.env.TRANSLOADIT_KEY!,
  authSecret: process.env.TRANSLOADIT_SECRET!,
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
