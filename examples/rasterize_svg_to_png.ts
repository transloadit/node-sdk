// Run this file as:
//
//   env TRANSLOADIT_KEY=xxx TRANSLOADIT_SECRET=yyy yarn tsx examples/rasterize_svg_to_png.ts ./examples/fixtures/circle.svg
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

const filePath = process.argv[2]

const status = await transloadit.createAssembly({
  files: {
    file1: filePath,
  },
  params: {
    steps: {
      png: {
        use: ':original',
        robot: '/image/resize',
        format: 'png',
      },
    },
  },
  waitForCompletion: true,
})
console.log('Your PNG file:', status.results?.png?.[0]?.url)
