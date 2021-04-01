/* eslint-disable no-await-in-loop */
const Transloadit         = require('transloadit')
const { default: PQueue } = require('p-queue')
const pr                  = require('@transloadit/pr')   // eslint-disable-line no-unused-vars
const prd                 = require('@transloadit/prd')  // eslint-disable-line no-unused-vars
const { v4: uuidv4 }      = require('uuid')

const CONCURRENCY = parseInt(process.argv[2] || 8, 10)
const COUNT       = parseInt(process.argv[3] || 1000, 10)

async function test () {
  const fantasyAssemblyId = uuidv4().replace(/\-/g, '')
  const transloadit = new Transloadit({
    // endpoint  : `https://api2-us-east-1.transloadit.com`,
    endpoint  : `https://staging-eu-west-1.transloadit.com`,
    authKey   : process.env.TRANSLOADIT_AUTH_KEY,
    authSecret: process.env.TRANSLOADIT_AUTH_SECRET,
    maxRetries: 1,
    timeout   : 40000,
  })

  const options = {
    assemblyId: fantasyAssemblyId,
    files     : {
      file1: `${__dirname}/../_assets/demos/inputs/anete-lusina-382336.jpg`,
    },
    params: {
      steps: {
        screenshotted: {
          robot : '/html/convert',
          result: true,
          width : 1024,
          url   : 'https://uppy.io',
          format: 'png',
        },
        audio_imported: {
          robot: '/http/import',
          url  : 'https://s3.amazonaws.com/test.transloadit.com/audio-merge-problems/audio_tag.mp3',
        },
        audio_encoded: {
          robot : '/audio/encode',
          use   : 'audio_imported',
          preset: 'aac',
        },
        resized: {
          use   : ':original',
          robot : '/image/resize',
          result: true,
          width : '${Math.max(fields.width, 75)}', // <-- uses Deno
          height: 75,
        },
        watermarked: {
          use: {
            steps: [
              { name: 'screenshotted', as: 'base' },
              { name: 'resized', as: 'watermark' },
            ],
          },
          watermark_position: ['bottom-left'],
          watermark_size    : '10%',
          robot             : '/image/resize',
          imagemagick_stack : 'v2.0.7',
          text              : [
            {
              text    : '© 2018 Transloadit.com',
              size    : 12,
              font    : 'Ubuntu',
              color   : '#eeeeee',
              valign  : 'bottom',
              align   : 'right',
              x_offset: 16,
              y_offset: -10,
            },
          ],
        },
      },
    },
    waitForCompletion: true,  // Wait for the Assembly (job) to finish executing before returning
  }

  let status
  try {
    status = await transloadit.createAssembly(options)
    if (!status || status.err || status.error) {
      console.error(status)
      console.error(`(https://api2.transloadit.com/assemblies/${fantasyAssemblyId})`)
      process.exit()
    }

    if (!status || !status.results || !status.results.watermarked) {
      console.error(status)
      throw new Error(`❌ The Assembly didn't produce any output. Make sure you used a valid image file`)
    }
  } catch (err) {
    console.error(err)
    console.error(status)
    console.error(`(https://api2.transloadit.com/assemblies/${fantasyAssemblyId})`)
    process.exit()
  }

  console.log(`✅ Success - Your watermarked image: ${status.results.watermarked[0].ssl_url} - Your audio encoded file: ${status.results.audio_encoded[0].ssl_url}`)
}

async function main () {
  console.log(`--> Running ${COUNT} Assemblies at concurrency ${CONCURRENCY} .. `)

  const runs = Array(COUNT)
  const q   = new PQueue({ concurrency: CONCURRENCY })
  // eslint-disable-next-line no-unused-vars
  for (const run of runs) {
    await q.add(async () => {
      try {
        await test()
      } catch (err) {
        console.error(`Exception raised while testing`)
        console.error(err)
      }
    })
  }

  await q.onIdle()
}

main().catch(err => {
  console.error('❌ Unable to process Assembly.', err)
  if (err.assemblyId) {
    console.error(`💡 More info: https://transloadit.com/assemblies/${err.assemblyId}`)
  }
  process.exit(1)
})
