/**
 * @jest-environment node
 */
// https://github.com/axios/axios/issues/2654
const localtunnel = require('localtunnel')
const http = require('http')
const keyBy = require('lodash/keyBy')
const sortBy = require('lodash/sortBy')
const querystring = require('querystring')
const temp = require('temp')
const { createWriteStream } = require('fs')
const { join } = require('path')
const { promisify } = require('util')
const { pipeline: streamPipeline } = require('stream')
const got = require('got')
const pipeline = promisify(streamPipeline)
const intoStream = require('into-stream')
const request = require('request')

const Transloadit = require('../../../src/Transloadit')

async function downloadTmpFile (url) {
  const { path } = await temp.open('transloadit')
  await pipeline(got.stream(url), createWriteStream(path))
  return path
}

function createClient (opts = {}) {
  const authKey = process.env.TRANSLOADIT_KEY
  const authSecret = process.env.TRANSLOADIT_SECRET
  if (authKey == null || authSecret == null) {
    throw new Error('Please specify environment variables TRANSLOADIT_KEY and TRANSLOADIT_SECRET')
  }

  return new Transloadit({ authKey, authSecret, ...opts })
}

const startServerAsync = async (handler) => new Promise((resolve, reject) => {
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

      resolve({
        url: tunnel.url,
        close () {
          tunnel.close()
        },
      })
    } catch (err) {
      server.close()
      reject(err)
    }
  })
})

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
const dummyStep = {
  use    : ':original',
  robot  : '/file/filter',
  accepts: [],
}
const genericParams = {
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
}
const genericOptions = {
  params           : genericParams,
  waitForCompletion: true,
}

jest.setTimeout(100000)

describe('API integration', function () {
  describe('assembly creation', () => {
    it('should create a retrievable assembly on the server', async () => {
      const client = createClient()

      let uploadProgressCalled
      let assemblyProgressCalled
      const options = {
        ...genericOptions,
        onUploadProgress  : (uploadProgress) => { uploadProgressCalled = uploadProgress },
        onAssemblyProgress: (assemblyProgress) => { assemblyProgressCalled = assemblyProgress },
      }
      let result = await client.createAssembly(options)
      expect(result).not.toHaveProperty('error')
      expect(result).toHaveProperty('ok')
      expect(result).toHaveProperty('assembly_id') // Since we're using it

      expect(uploadProgressCalled).toBeUndefined()
      expect(assemblyProgressCalled).toMatchObject({ assembly_id: result.assembly_id })

      const id = result.assembly_id

      result = await client.getAssembly(id)
      expect(result).not.toHaveProperty('error')
      expect(result).toEqual(expect.objectContaining({
        assembly_ssl_url: expect.any(String),
        assembly_url    : expect.any(String),
        ok              : expect.any(String),
        assembly_id     : id,
      }))
    })

    it("should signal an error if a file selected for upload doesn't exist", async () => {
      const client = createClient()

      const params = {
        params: {
          steps: {
            resize: resizeOriginalStep,
          },
        },
        files: {
          original: temp.path({ suffix: '.transloadit.jpg' }), // Non-existing path
        },
      }

      const promise = client.createAssembly(params)
      await expect(promise).rejects.toThrow()
      await expect(promise).rejects.toThrow(expect.objectContaining({ code: 'ENOENT' }))
    })

    it('should allow uploading files that do exist', async () => {
      const client = createClient()

      const params = {
        params: {
          steps: {
            resize: resizeOriginalStep,
          },
        },
        files: {
          original: await downloadTmpFile(genericImg),
        },
        waitForCompletion: true,
      }

      const result = await client.createAssembly(params)
      expect(result.uploads[0].field).toBe('original')
    })

    it('should allow setting fields', async () => {
      const client = createClient()

      const params = {
        waitForCompletion: true,
        params           : {
          fields: { myField: 'test', num: 1, obj: { foo: 'bar' } },
          steps : { resize: resizeOriginalStep },
        },
      }

      const result = await client.createAssembly(params)
      expect(result.fields.myField).toBe('test')
      expect(result.fields.num).toBe(1)
      expect(result.fields.obj).toStrictEqual({ foo: 'bar' })
    })

    it('should allow adding different types', async () => {
      const client = createClient()

      const buf = Buffer.from(sampleSvg, 'utf-8')

      const params = {
        waitForCompletion: true,
        uploads          : {
          file1: intoStream(sampleSvg),
          file2: sampleSvg,
          file3: buf,
          file4: got.stream(genericImg),
        },
        params: {
          steps: {
            dummy: dummyStep,
          },
        },
      }

      const result = await client.createAssembly(params)
      // console.log(result)

      const getMatchObject = ({ name }) => ({
        name             : name,
        basename         : name,
        ext              : '',
        size             : 117,
        mime             : 'image/svg+xml',
        type             : 'image',
        field            : name,
        md5hash          : '1b199e02dd833b2278ce2a0e75480b14',
        original_basename: name,
        original_name    : name,
        original_path    : '/',
        original_md5hash : '1b199e02dd833b2278ce2a0e75480b14',
      })
      const uploadsKeyed = keyBy(result.uploads, 'name') // Because order is not same as input
      expect(uploadsKeyed.file1).toMatchObject(getMatchObject({ name: 'file1' }))
      expect(uploadsKeyed.file2).toMatchObject(getMatchObject({ name: 'file2' }))
      expect(uploadsKeyed.file3).toMatchObject(getMatchObject({ name: 'file3' }))
      expect(uploadsKeyed.file4).toMatchObject({
        name             : 'file4',
        basename         : 'file4',
        ext              : '',
        size             : 133788,
        mime             : 'image/jpeg',
        type             : 'image',
        field            : 'file4',
        md5hash          : '42f29c0d9d5f3ea807ef3c327f8c5890',
        original_basename: 'file4',
        original_name    : 'file4',
        original_path    : '/',
        original_md5hash : '42f29c0d9d5f3ea807ef3c327f8c5890',
      })
    })

    it('should throw a proper error for request stream', async () => {
      const client = createClient()

      const req = request(genericImg)

      const promise = client.createAssembly({ uploads: { file: req } })
      await expect(promise).rejects.toThrow(expect.objectContaining({ message: 'Upload named "file" is not a Readable stream' }))
    })

    async function testUploadProgress (isResumable) {
      const client = createClient()

      let progressCalled = false
      function onUploadProgress ({ uploadedBytes }) {
        // console.log(uploadedBytes)
        expect(uploadedBytes).toBeDefined()
        progressCalled = true
      }

      const params = {
        isResumable,
        params: {
          steps: {
            resize: resizeOriginalStep,
          },
        },
        files: {
          original: await downloadTmpFile(genericImg),
        },
        onUploadProgress,
      }

      await client.createAssembly(params)
      expect(progressCalled).toBe(true)
    }

    it('should trigger progress callbacks when uploading files, resumable', async () => {
      await testUploadProgress(true)
    })

    it('should trigger progress callbacks when uploading files, nonresumable', async () => {
      await testUploadProgress(false)
    })

    it('should return properly waitForCompletion is false', async () => {
      const client = createClient()
      const params = { ...genericOptions, waitForCompletion: false }

      const result = await client.createAssembly(params)
      expect(result).not.toHaveProperty('error')
      expect(result).toHaveProperty('ok')
    })

    it('should exit fast when assembly has failed', async () => {
      // An old bug caused it to continuously retry until timeout when errors such as INVALID_FILE_META_DATA
      // Note: This test sometimes reproduces the case where the server returns 200 but with an "error" in the response
      const client = createClient()
      const opts = {
        params: {
          steps: {
            resize: resizeOriginalStep,
          },
        },
        files: {
          file: join(__dirname, './fixtures/zerobytes.jpg'),
        },
        waitForCompletion: true,
      }

      const promise = client.createAssembly(opts)
      await promise.catch((err) => {
        expect(err).toMatchObject({ transloaditErrorCode: 'INVALID_FILE_META_DATA', assemblyId: expect.any(String) })
      })
      await expect(promise).rejects.toThrow(Error)
    }, 7000)
  })

  describe('assembly cancelation', () => {
    it('should stop the assembly from reaching completion', async () => {
      const client = createClient()

      // We need to ensure that the assembly doesn't complete before it can be
      // canceled, so we start an http server for the assembly to import from,
      // and delay transmission of data until we've already sent the cancel
      // request

      // Async book-keeping for delaying the response
      let sendServerResponse

      const promise = new Promise((resolve) => {
        sendServerResponse = resolve
      })

      const handleRequest = async (req, res) => {
        // console.log('handler', req.url)

        expect(req.url).toBe('/')

        await promise

        // console.log('sending response')
        res.setHeader('Content-type', 'image/jpeg')
        res.writeHead(200)
        got.stream(genericImg).pipe(res)
      }

      const server = await startServerAsync(handleRequest)

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
        const { assembly_id: id } = await client.createAssembly(params)

        const awaitCompletionPromise = (async () => {
          try {
            const ret = await client.awaitAssemblyCompletion(id)
            return ret
          } catch (err) {
            console.error(err)
            return null
          }
        })()

        // Now delete it before uploading is done
        // console.log('canceling', id)
        const resp = await client.cancelAssembly(id)
        expect(resp.ok).toBe('ASSEMBLY_CANCELED')
        // console.log('canceled', id)

        // Allow the upload to finish
        sendServerResponse()

        // Successful cancel requests get ASSEMBLY_CANCELED even when it
        // completed, so we now request the assembly status to check the
        // *actual* status.
        const resp2 = await client.getAssembly(id)
        expect(resp2.ok).toBe('ASSEMBLY_CANCELED')

        // Check that awaitAssemblyCompletion gave the correct response too
        const awaitCompletionResponse = await awaitCompletionPromise
        expect(awaitCompletionResponse.ok).toBe('ASSEMBLY_CANCELED')
      } finally {
        server.close()
      }
    })
  })

  describe('replaying assemblies', () => {
    it('should replay an assembly and await the replay', async () => {
      const client = createClient()

      const createdAssembly = await client.createAssembly(genericOptions)

      const replayedAssembly = await client.replayAssembly(createdAssembly.assembly_id)
      expect(replayedAssembly.ok).toBe('ASSEMBLY_REPLAYING')
      expect(replayedAssembly.assembly_id).not.toEqual(createdAssembly.assembly_id)
      expect(replayedAssembly.assembly_url).toBeDefined()
      // TODO bug?
      // expect(replayedAssembly.assembly_ssl_url).toBeDefined()

      const result2 = await client.awaitAssemblyCompletion(replayedAssembly.assembly_id)
      expect(result2.ok).toBe('ASSEMBLY_COMPLETED')
    })
  })

  describe('assembly list retrieval', () => {
    it('should retrieve a list of assemblies', async () => {
      const client = createClient()

      const result = await client.listAssemblies()
      expect(result).toEqual(expect.objectContaining({ count: expect.any(Number), items: expect.any(Array) }))
    })

    it('should be able to handle pagination with a stream', done => {
      const client = createClient()
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
      const client = createClient()

      // listens for notifications
      const onNotificationRequest = async (req, res) => {
        try {
          expect(req.method).toBe('POST')
          const body = await streamToString(req)
          const result = JSON.parse(querystring.parse(body).transloadit)
          expect(result).toHaveProperty('ok')
          if (result.ok !== 'ASSEMBLY_COMPLETED') return onError(new Error(`result.ok was ${result.ok}`))

          res.writeHead(200)
          res.end()

          onNotification({ path: req.url, client, assemblyId: result.assembly_id })
        } catch (err) {
          onError(err)
        }
      }

      try {
        server = await startServerAsync(onNotificationRequest)
        await client.createAssembly({ params: { ...genericParams, notify_url: server.url } })
      } catch (err) {
        onError(err)
      }
    }

    it('should send a notification upon assembly completion', async () => {
      await new Promise((resolve, reject) => {
        const onNotification = async ({ path, client, assemblyId }) => {
          try {
            expect(path).toBe('/')
            resolve()
          } catch (err) {
            reject(err)
          }
        }
        runNotificationTest(onNotification, reject)
      })
    })

    it('should replay the notification when requested', (done) => {
      let secondNotification = false

      const onNotification = async ({ path, client, assemblyId }) => {
        const newPath = '/newPath'
        const newUrl = `${server.url}${newPath}`

        if (secondNotification) {
          expect(path).toBe(newPath)

          try {
            // I think there are some eventual consistency issues here
            await new Promise((resolve) => setTimeout(resolve, 1000))

            const result = await client.listAssemblyNotifications({ assembly_id: assemblyId })
            const chronologicalItems = sortBy(result.items, 'created') // They don't come sorted
            expect(chronologicalItems[0].url).toBe(server.url)
            expect(chronologicalItems[1].url).toBe(newUrl)

            // If we quit immediately, things will not get cleaned up and jest will hang
            await new Promise((resolve) => setTimeout(resolve, 2000))
            done()
          } catch (err) {
            done(err)
          }

          return
        }
        secondNotification = true

        try {
          expect(path).toBe('/')
          await new Promise((resolve) => setTimeout(resolve, 2000))
          await client.replayAssemblyNotification(assemblyId, { notify_url: newUrl })
        } catch (err) {
          done(err)
        }
      }

      runNotificationTest(onNotification, (err) => done(err))
    })
  })

  describe('template methods', () => {
    // can contain only lowercase latin letters, numbers, and dashes.
    const templName = `node-sdk-test-${new Date().toISOString().toLocaleLowerCase('en-US').replace(/[^0-9a-z-]/g, '-')}`
    let templId = null
    const client = createClient()

    it('should allow listing templates', async () => {
      const result = await client.listTemplates()
      expect(result.items).toBeInstanceOf(Array)
    })

    it('should allow creating a template', async () => {
      const template = await client.createTemplate({ name: templName, template: genericParams })
      templId = template.id
    })

    it("should be able to fetch a template's definition", async () => {
      expect(templId).toBeDefined()

      const template = await client.getTemplate(templId)
      const { name, content } = template
      expect(name).toBe(templName)
      expect(content).toEqual(genericParams)
    })

    it('should allow editing a template', async () => {
      const editedTemplate = {
        steps: {
          dummy: dummyStep,
        },
      }

      const editedName = `${templName}-edited`
      const editResult = await client.editTemplate(templId, { name: editedName, template: editedTemplate })
      expect(editResult.ok).toBe('TEMPLATE_UPDATED')
      expect(editResult.id).toBe(templId)
      expect(editResult.name).toBe(editedName)
      expect(editResult.content).toStrictEqual(editedTemplate)
    })

    it('should delete the template successfully', async () => {
      expect(templId).toBeDefined()

      const template = await client.deleteTemplate(templId)
      const { ok } = template
      expect(ok).toBe('TEMPLATE_DELETED')
      await expect(client.getTemplate(templId)).rejects.toThrow(expect.objectContaining({ transloaditErrorCode: 'TEMPLATE_NOT_FOUND' }))
    })
  })
})
