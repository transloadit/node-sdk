// Run this file as:
//
//   env TRANSLOADIT_KEY=xxx TRANSLOADIT_SECRET=yyy node examples/face_detect_download.js ./fixtures/berkley.jpg
//
// This example will take an image and find a face and crop out the face.
// Then it will download the result as a file in the current directory
// See https://transloadit.com/demos/artificial-intelligence/detect-faces-in-images/

const got = require('got')
const { createWriteStream } = require('fs')

// You'll likely just want to `require('transloadit')`, but we're requiring the local
// variant here for easier testing:
const Transloadit = require('../src/Transloadit')

const transloadit = new Transloadit({
  authKey: process.env.TRANSLOADIT_KEY,
  authSecret: process.env.TRANSLOADIT_SECRET,
})

const filePath = process.argv[2]

;(async () => {
  try {
    const opts = {
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
    }

    const status = await transloadit.createAssembly(opts)

    // Now save the file
    const outPath = './output-face.jpg'
    const stream = createWriteStream(outPath)
    await got.stream(status.results.facesDetected[0].url).pipe(stream)
    console.log('Your cropped face has been saved to', outPath)
  } catch (err) {
    console.error('createAssembly failed', err)
  }
})()
