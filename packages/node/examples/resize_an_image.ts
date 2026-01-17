// Run this file as:
//
//   env TRANSLOADIT_KEY=xxx TRANSLOADIT_SECRET=yyy yarn tsx examples/resize_an_image.ts ./examples/fixtures/berkley.jpg
//
// You may need to build the project first using:
//
//   yarn prepack
//
import { Transloadit } from 'transloadit'

const { TRANSLOADIT_KEY, TRANSLOADIT_SECRET } = process.env
if (TRANSLOADIT_KEY == null || TRANSLOADIT_SECRET == null) {
  throw new Error('Please set TRANSLOADIT_KEY and TRANSLOADIT_SECRET')
}
const transloadit = new Transloadit({
  authKey: TRANSLOADIT_KEY,
  authSecret: TRANSLOADIT_SECRET,
})

const status = await transloadit.createAssembly({
  files: {
    file1: process.argv[2],
  },
  params: {
    steps: {
      resized: {
        use: ':original',
        robot: '/image/resize',
        result: true,
        imagemagick_stack: 'v2.0.7',
        width: 75,
        height: 75,
      },
    },
  },
  waitForCompletion: true,
})
console.log('Your resized image:', status.results?.resize?.[0]?.url)
