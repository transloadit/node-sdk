// Run this file as:
//
//   env TRANSLOADIT_KEY=xxx TRANSLOADIT_SECRET=yyy yarn tsx examples/convert_to_webp.ts ./examples/fixtures/berkley.jpg
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
      webp: {
        use: ':original',
        robot: '/image/resize',
        result: true,
        imagemagick_stack: 'v2.0.7',
        format: 'webp',
      },
    },
  },
  waitForCompletion: true,
})
console.log('Your WebP file:', status.results?.webp?.[0]?.url)
