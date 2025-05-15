// Run this file as:
//
//   env TRANSLOADIT_KEY=xxx TRANSLOADIT_SECRET=yyy node resize_an_image.js ./examples/fixtures/berkley.jpg
//
// You may need to build the project first using:
//
//   yarn prepack
//
import { Transloadit } from 'transloadit'

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
      resize: {
      resized: {
        use: ':original',
        robot: '/image/resize',
        result: true,
        imagemagick_stack: 'v2.0.7',
        width: 75,
        height: 75,
        quality: 100,
        strip: true,
      },
    },
  },
  waitForCompletion: true,
})
console.log('Your resized image:', status.results?.resize?.[0]?.url)
