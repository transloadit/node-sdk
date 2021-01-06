// const localtunnel = require('localtunnel')
// const http = require('http')
// const querystring = require('querystring')
const temp = require('temp')
const fs = require('fs')
const { join } = require('path')
const { promisify } = require('util')
const { pipeline: streamPipeline, PassThrough } = require('stream')
const got = require('got')
const pipeline = promisify(streamPipeline)
const intoStream = require('into-stream')

const TransloaditClient = require('../../../src/TransloaditClient')

async function downloadTmpFile (url) {
  const { path } = await temp.open('transloadit')
  await pipeline(got.stream(url), fs.createWriteStream(path))
  return path
}

const authKey = process.env.TRANSLOADIT_KEY
const authSecret = process.env.TRANSLOADIT_SECRET
if (authKey == null || authSecret == null) {
  throw new Error('Please specify environment variables TRANSLOADIT_KEY and TRANSLOADIT_SECRET')
}

/* const startServerAsync = async (handler) => new Promise((resolve, reject) => {
  const server = http.createServer(handler)

  // Find a port to use
  let port = 8000
  server.on('error', err => {
    if (err.code === 'EADDRINUSE') {
      if (++port >= 65535) {
        server.close()
        reject(new Error('Failed to bind to port'))
      }
      return server.listen(port, '127.0.0.1')
    } else {
      return reject(err)
    }
  })

  server.listen(port, '127.0.0.1')

  // Once a port has been found and the server is ready, setup the
  // localtunnel
  server.on('listening', async () => {
    try {
      const tunnel = await localtunnel(port)
      // console.log('localtunnel', tunnel.url)

      tunnel.on('error', console.error)
      tunnel.on('close', () => {
        // console.log('tunnel closed')
        server.close()
      })

      return resolve({
        url: tunnel.url,
        close () {
          tunnel.close()
        },
      })
    } catch (err) {
      if (err != null) {
        server.close()
        return reject(err)
      }
    }
  })
}) */

// https://transloadit.com/demos/importing-files/import-a-file-over-http
const genericImg = 'https://demos.transloadit.com/66/01604e7d0248109df8c7cc0f8daef8/snowflake.jpg'
const sampleSvg = '<?xml version="1.0" standalone="no"?><svg height="100" width="100"><circle cx="50" cy="50" r="40" fill="red" /></svg>'
const resizeOriginalStep = {
  robot : '/image/resize',
  use   : ':original',
  result: true,
  width : 130,
  height: 130,
}
const genericParams = {
  params: {
    steps: {
      import: {
        robot: '/http/import',
        url  : genericImg,
      },
      resize: {
        robot : '/image/resize',
        use   : 'import',
        result: true,
        width : 130,
        height: 130,
      },
    },
  },
  waitForCompletion: true,
}

jest.setTimeout(100000)

describe('API integration', function () {
  describe('assembly creation', () => {
    it('should create a retrievable assembly on the server', done => {
      const client = new TransloaditClient({ authKey, authSecret })

      return client.createAssembly(genericParams, (err, result) => {
        expect(err).toBeFalsy()
        expect(result).not.toHaveProperty('error')
        expect(result).toHaveProperty('ok')
        expect(result).toHaveProperty('assembly_id') // Since we're using it

        const id = result.assembly_id

        return client.getAssembly(id, (err, result) => {
          expect(err).toBeFalsy()
          expect(result).not.toHaveProperty('error')
          expect(result).toEqual(expect.objectContaining({
            assembly_url: expect.any(String),
            ok          : expect.any(String),
            assembly_id : id,
          }))
          return done()
        })
      })
    })

    it("should signal an error if a file selected for upload doesn't exist", async () => {
      const client = new TransloaditClient({ authKey, authSecret })

      const params = {
        params: {
          steps: {
            resize: resizeOriginalStep,
          },
        },
      }

      client.addFile('original', temp.path({ suffix: '.transloadit.jpg' })) // Non-existing path

      const promise = client.createAssemblyAsync(params)
      await expect(promise).rejects.toThrow()
      await expect(promise).rejects.toThrow(expect.objectContaining({ code: 'ENOENT' }))
    })

    it('should allow uploading files that do exist', async () => {
      const client = new TransloaditClient({ authKey, authSecret })

      const params = {
        params: {
          steps: {
            resize: resizeOriginalStep,
          },
        },
      }

      const path = await downloadTmpFile(genericImg)
      client.addFile('original', path)

      await client.createAssemblyAsync(params)
    })

    it('should allow setting fields', async () => {
      const client = new TransloaditClient({ authKey, authSecret })

      const params = {
        waitForCompletion: true,
        params           : {
          fields: { myField: 'test' },
          steps : { resize: resizeOriginalStep },
        },
      }

      const result = await client.createAssemblyAsync(params)
      expect(result.fields.myField).toBe('test')
    })

    function createStreamFromString (str) {
      const rawStream = intoStream(str)
      // Workaround for https://github.com/tus/tus-js-client/issues/229
      const stream = new PassThrough()
      rawStream.pipe(stream)
      return stream
    }

    it('should allow adding a stream', async () => {
      const client = new TransloaditClient({ authKey, authSecret })

      const params = {
        waitForCompletion: true,
        params           : {
          steps: {
            rasterize: {
              robot : '/image/resize',
              use   : ':original',
              format: 'jpg',
            },
          },
        },
      }

      client.addStream('test', createStreamFromString(sampleSvg))

      const result = await client.createAssemblyAsync(params)
      expect(result.results.rasterize).toHaveLength(1)
      expect(result.results.rasterize[0].name).toBe('test.jpg')
    })

    async function testUploadProgress (isResumable) {
      const client = new TransloaditClient({ authKey, authSecret })

      const params = {
        isResumable,
        params: {
          steps: {
            resize: resizeOriginalStep,
          },
        },
      }

      const path = await downloadTmpFile(genericImg)
      client.addFile('original', path)

      let progressCalled = false
      function onProgress (progress) {
        // console.log(progress)
        expect(progress.uploadProgress.uploadedBytes).toBeDefined()
        progressCalled = true
      }
      await client.createAssemblyAsync(params, onProgress)
      expect(progressCalled).toBe(true)
    }

    it('should trigger progress callbacks when uploading files, resumable', async () => {
      await testUploadProgress(true)
    })

    it('should trigger progress callbacks when uploading files, nonresumable', async () => {
      await testUploadProgress(false)
    })

    it('should trigger the callback when waitForCompletion is false', done => {
      const client = new TransloaditClient({ authKey, authSecret })
      const params = Object.assign({}, genericParams, { waitForCompletion: false })

      return client.createAssembly(params, (err, result) => {
        expect(err).toBeFalsy()
        expect(result).not.toHaveProperty('error')
        expect(result).toHaveProperty('ok')
        return done()
      })
    })

    it('should exit fast when assembly has failed', async () => {
      // An old bug caused it to continuously retry until timeout when errors such as INVALID_FILE_META_DATA
      const client = new TransloaditClient({ authKey, authSecret })
      const opts = {
        params: {
          steps: {
            resize: resizeOriginalStep,
          },
        },
        waitForCompletion: true,
      }
      client.addFile('file', join(__dirname, './fixtures/zerobytes.jpg'))

      const promise = client.createAssemblyAsync(opts)
      await promise.catch((err) => {
        expect(err).toMatchObject({ error: 'INVALID_FILE_META_DATA', assembly_id: expect.any(String) })
      })
      await expect(promise).rejects.toThrow(Error)
    }, 7000)
  })

  describe('assembly cancelation', () => {
    /* it('should stop the assembly from reaching completion', async () => {
      const client = new TransloaditClient({ authKey, authSecret })

      // We need to ensure that the assembly doesn't complete before it can be
      // canceled, so we start an http server for the assembly to import from,
      // and delay transmission of data until we've already sent the cancel
      // request

      // Async book-keeping for delaying the response
      let sendServerResponse

      const promise = new Promise((resolve) => {
        sendServerResponse = resolve
      })

      const handler = async (req, res) => {
        // console.log('handler', req.url)

        expect(req.url).toBe('/')

        await promise

        res.setHeader('Content-type', 'image/jpeg')
        res.writeHead(200)
        got.stream(genericImg).pipe(res)
      }

      const server = await startServerAsync(handler)

      try {
        const params = {
          params: {
            steps: {
              import: {
                robot: '/http/import',
                url  : server.url,
              },
              resize: {
                robot : '/image/resize',
                use   : 'import',
                result: true,
                width : 130,
                height: 130,
              },
            },
          },
        }

        // Finally send the createAssembly request
        const { assembly_id: id } = await client.createAssemblyAsync(params)

        // Now delete it
        const resp = await client.deleteAssemblyAsync(id)

        // Allow the upload to finish
        sendServerResponse()

        expect(resp.ok).toBe('ASSEMBLY_CANCELED')

        // Successful cancel requests get ASSEMBLY_CANCELED even when it
        // completed, so we now request the assembly status to check the
        // *actual* status.
        const resp2 = await client.getAssemblyAsync(id)
        expect(resp2.ok).toBe('ASSEMBLY_CANCELED')
      } finally {
        server.close()
      }
    }) */
  })

  describe('replaying assemblies', () => {
    it('should replay an assembly after it has completed', done => {
      const client = new TransloaditClient({ authKey, authSecret })

      client.createAssembly(genericParams, (err, { assembly_id: assemblyId } = {}) => {
        expect(err).toBeFalsy()

        const originalId = assemblyId

        // ensure that the assembly has completed
        const ensureCompletion = cb =>
          client.getAssembly(originalId, (err, result) => {
            expect(err).toBeFalsy()
            const ok = result.ok

            if (ok === 'ASSEMBLY_UPLOADING' || ok === 'ASSEMBLY_EXECUTING') {
              setTimeout(() => ensureCompletion(cb), 1000)
            } else {
              cb()
            }
          })

        // Start an asynchonous loop
        ensureCompletion(() =>
          client.replayAssembly({ assembly_id: originalId }, (err, { ok } = {}) => {
            expect(err).toBeFalsy()
            expect(ok).toBe('ASSEMBLY_REPLAYING')
            done()
          }),
        )
      })
    })
  })

  describe('assembly list retrieval', () => {
    it('should retrieve a list of assemblies', async () => {
      const client = new TransloaditClient({ authKey, authSecret })

      const result = await client.listAssembliesAsync({})
      expect(result).toEqual(expect.objectContaining({ count: expect.any(Number), items: expect.any(Array) }))
    })

    it('should be able to handle pagination with a stream', done => {
      const client = new TransloaditClient({ authKey, authSecret })
      const assemblies = client.streamAssemblies({ pagesize: 2 })
      let n = 0
      let isDone = false

      assemblies.on('readable', () => {
        const assembly = assemblies.read()

        if (isDone) return

        if (assembly == null) {
          return done()
        }

        if (n === 5) {
          isDone = true
          return done()
        }

        expect(assembly).toHaveProperty('id')
        n++
      })
    })
  })

  /*
  describe('assembly notification', () => {
    let server
    afterEach(() => {
      if (server) server.close()
    })

    // helper function
    const streamToString = (stream) => new Promise((resolve, reject) => {
      const chunks = []
      stream.on('data', chunk => chunks.push(chunk))
      stream.on('error', err => reject(err))
      stream.on('end', () => resolve(chunks.join('')))
    })

    const runNotificationTest = async (onNotification, onError) => {
      const client = new TransloaditClient({ authKey, authSecret })

      // listens for notifications
      const onNotificationRequest = async (req, res) => {
        try {
          expect(req.url).toBe('/')
          expect(req.method).toBe('POST')
          const body = await streamToString(req)
          const result = JSON.parse(querystring.parse(body).transloadit)
          expect(result).toHaveProperty('ok')
          if (result.ok !== 'ASSEMBLY_COMPLETED') return onError(new Error(`result.ok was ${result.ok}`))

          res.writeHead(200)
          res.end()

          onNotification({ client, assemblyId: result.assembly_id })
        } catch (err) {
          onError(err)
        }
      }

      try {
        server = await startServerAsync(onNotificationRequest)
        await client.createAssemblyAsync({ params: { ...genericParams.params, notify_url: server.url } })
      } catch (err) {
        onError(err)
      }
    }

    it('should send a notification upon assembly completion', async () => {
      await new Promise((resolve, reject) => runNotificationTest(resolve, reject))
    })

    it('should replay the notification when requested', (done) => {
      let notificationsRecvd = false

      const onNotification = async ({ client, assemblyId }) => {
        if (notificationsRecvd) {
          // If we quit immediately, things will not get cleaned up and jest will hang
          await new Promise((resolve) => setTimeout(resolve, 2000))
          done()
          return
        }
        notificationsRecvd = true

        try {
          await new Promise((resolve) => setTimeout(resolve, 2000))
          await client.replayAssemblyNotificationAsync({ assembly_id: assemblyId })
        } catch (err) {
          done(err)
        }
      }

      runNotificationTest(onNotification, (err) => done(err))
    })
  })
  */

  describe('template methods', () => {
    // can contain only lowercase latin letters, numbers, and dashes.
    const templName = `node-sdk-test-${new Date().toISOString().toLocaleLowerCase('en-US').replace(/[^0-9a-z-]/g, '-')}`
    let templId = null
    const client = new TransloaditClient({ authKey, authSecret })

    it('should allow creating a template', async () => {
      const { id } = await client.createTemplateAsync({ name: templName, template: genericParams.params })
      templId = id
    })

    it("should be able to fetch a template's definition", async () => {
      expect(templId).toBeDefined()

      const { name, content } = await client.getTemplateAsync(templId)
      expect(name).toBe(templName)
      expect(content).toEqual(genericParams.params)
    })

    it('should delete the template successfully', done => {
      expect(templId).toBeDefined()

      client.deleteTemplate(templId, (err, { ok } = {}) => {
        expect(err).toBeFalsy()
        expect(ok).toBe('TEMPLATE_DELETED')
        client.getTemplate(templId, (err, result) => {
          expect(result).toBeFalsy()
          expect(err).toBeDefined()
          expect(err.error).toBe('TEMPLATE_NOT_FOUND')
          done()
        })
      })
    })
  })
})
