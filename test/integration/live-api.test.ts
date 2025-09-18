import { randomUUID } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import type { IncomingMessage, RequestListener } from 'node:http'
import { join } from 'node:path'
import { parse } from 'node:querystring'
import { pipeline } from 'node:stream/promises'
import { setTimeout } from 'node:timers/promises'
import debug from 'debug'
import { config } from 'dotenv'
import got, { type RetryOptions } from 'got'
import intoStream from 'into-stream'
import * as temp from 'temp'
import type { InterpolatableRobotFileFilterInstructionsInput } from '../../src/alphalib/types/robots/file-filter.ts'
import type { InterpolatableRobotImageResizeInstructionsInput } from '../../src/alphalib/types/robots/image-resize.ts'
import {
  type CreateAssemblyOptions,
  type CreateAssemblyParams,
  Transloadit,
  type UploadProgress,
} from '../../src/Transloadit.ts'
import { createTestServer, type TestServer } from '../testserver.ts'
import { createProxy } from '../util.ts'

// Load environment variables from .env file
config()

const log = debug('transloadit:live-api')

function nn<T>(value: T | null | undefined, name = 'value'): T {
  if (value == null) throw new Error(`${name} was undefined`)
  return value
}

async function downloadTmpFile(url: string) {
  const { path } = await temp.open('transloadit')
  await pipeline(got.stream(url), createWriteStream(path))
  return path
}

function createClient(opts = {}) {
  const authKey = process.env.TRANSLOADIT_KEY
  const authSecret = process.env.TRANSLOADIT_SECRET
  if (authKey == null || authSecret == null) {
    throw new Error('Please specify environment variables TRANSLOADIT_KEY and TRANSLOADIT_SECRET')
  }

  // https://github.com/sindresorhus/got/blob/main/documentation/7-retry.md#retry
  const gotRetry: Partial<RetryOptions> = {
    limit: 2,
    methods: [
      'GET',
      'PUT',
      'HEAD',
      'DELETE',
      'OPTIONS',
      'TRACE',
      'POST', // Normally we shouldn't retry on POST, as it is not idempotent, but for tests we can do it
    ],
    calculateDelay: () => 0,
    statusCodes: [],
    errorCodes: [
      'ETIMEDOUT',
      'ECONNRESET',
      'EADDRINUSE',
      'ECONNREFUSED',
      'EPIPE',
      'ENOTFOUND',
      'ENETUNREACH',
      'EAI_AGAIN',
    ],
  }

  // lower timeout so we don't get a race condition with test timeout which is 60sec
  const timeout = 30000

  return createProxy(new Transloadit({ authKey, authSecret, gotRetry, timeout, ...opts }))
}

function createAssembly(client: Transloadit, params: CreateAssemblyOptions) {
  const promise = client.createAssembly(params)
  const { assemblyId } = promise
  console.log(expect.getState().currentTestName, 'createAssembly', assemblyId) // For easier debugging
  return promise
}

// https://transloadit.com/demos/importing-files/import-a-file-over-http
const genericImg = 'https://demos.transloadit.com/66/01604e7d0248109df8c7cc0f8daef8/snowflake.jpg'
const sampleSvg =
  '<?xml version="1.0" standalone="no"?><svg height="100" width="100"><circle cx="50" cy="50" r="40" fill="red" /></svg>'
const resizeOriginalStep: InterpolatableRobotImageResizeInstructionsInput = {
  robot: '/image/resize',
  use: ':original',
  result: true,
  width: 130,
  height: 130,
}
const dummyStep: InterpolatableRobotFileFilterInstructionsInput = {
  use: ':original',
  robot: '/file/filter',
  accepts: [],
}
const genericParams: CreateAssemblyParams = {
  steps: {
    import: {
      robot: '/http/import',
      url: genericImg,
    },
    resize: {
      robot: '/image/resize',
      use: 'import',
      result: true,
      width: 130,
      height: 130,
    },
  },
}
const genericOptions = {
  params: genericParams,
  waitForCompletion: true,
}

const handlers = new Map()

let testServer: TestServer

beforeAll(async () => {
  // cloudflared tunnels are a bit unstable, so we share one cloudflared tunnel between all tests
  // we do this by prefixing each "virtual" server under a uuid subpath
  testServer = await createTestServer((req, res) => {
    const regex = /^\/([^/]+)/
    const match = req.url?.match(regex)
    if (match) {
      const [, id] = match
      const handler = handlers.get(id)
      if (handler) {
        req.url = req.url?.replace(regex, '')
        if (req.url === '') req.url = '/'
        handler(req, res)
      } else {
        log('request handler for UUID not found', id)
      }
    } else {
      log('Invalid path match', req.url)
    }
  })
}, 100000)

afterAll(async () => {
  await testServer?.close()
})

interface VirtualTestServer {
  close: () => void
  url: string
}

async function createVirtualTestServer(handler: RequestListener): Promise<VirtualTestServer> {
  const id = randomUUID()
  log('Adding virtual server handler', id)
  const url = `${testServer.url}/${id}`
  handlers.set(id, handler)

  function close() {
    handlers.delete(id)
  }

  return {
    close,
    url,
  }
}

describe('API integration', { timeout: 60000 }, () => {
  describe('assembly creation', () => {
    it('should create a retrievable assembly on the server', async () => {
      const client = createClient()

      let uploadProgressCalled: UploadProgress | undefined
      const options: CreateAssemblyOptions = {
        ...genericOptions,
        onUploadProgress: (uploadProgress) => {
          uploadProgressCalled = uploadProgress
        },
        // Often an assembly will finish before the node-sdk has time to emit an onAssemblyProgress event,
        // so we cannot rely on that (will cause unstable tests)
        // onAssemblyProgress: (assemblyProgress) => { assemblyProgressCalled = assemblyProgress },
      }
      let result = await createAssembly(client, options)
      expect(result).not.toHaveProperty('error')
      expect(result).toHaveProperty('ok')
      expect(result).toHaveProperty('assembly_id') // Since we're using it

      expect(uploadProgressCalled).toBeUndefined()

      const id = result.assembly_id

      expect(id).toBeDefined()
      result = await client.getAssembly(nn(id, 'assembly_id'))
      expect(result).not.toHaveProperty('error')
      expect(result).toEqual(
        expect.objectContaining({
          assembly_ssl_url: expect.any(String),
          assembly_url: expect.any(String),
          ok: expect.any(String),
          assembly_id: id,
        }),
      )
    })

    it("should signal an error if a file selected for upload doesn't exist", async () => {
      const client = createClient()

      const promise = createAssembly(client, {
        params: {
          steps: {
            resize: resizeOriginalStep,
          },
        },
        files: {
          original: temp.path({ suffix: '.transloadit.jpg' }), // Non-existing path
        },
      })
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

      const result = await createAssembly(client, params)
      expect(result.uploads?.[0]?.field).toBe('original')
    })

    it('should allow setting fields', async () => {
      const client = createClient()

      const result = await createAssembly(client, {
        waitForCompletion: true,
        params: {
          fields: { myField: 'test', num: 1, obj: { foo: 'bar' } },
          steps: { resize: resizeOriginalStep },
        },
      })
      expect(result.fields?.myField).toBe('test')
      expect(result.fields?.num).toBe(1)
      expect(result.fields?.obj).toStrictEqual({ foo: 'bar' })
    })

    it('should allow adding different types', async () => {
      const client = createClient()

      const buf = Buffer.from(sampleSvg, 'utf-8')

      const params = {
        waitForCompletion: true,
        uploads: {
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

      const result = await createAssembly(client, params)
      // console.log(result)

      const getMatchObject = ({ name }: { name: string }) => ({
        name,
        basename: name,
        ext: 'svg',
        size: 117,
        mime: 'image/svg+xml',
        type: 'image',
        field: name,
        md5hash: '1b199e02dd833b2278ce2a0e75480b14',
        original_basename: name,
        original_name: name,
        original_path: '/',
        original_md5hash: '1b199e02dd833b2278ce2a0e75480b14',
      })
      // Because order is not same as input
      const uploadsMap = Object.fromEntries(
        result.uploads?.map((upload) => [upload.name, upload]) ?? [],
      )
      expect(uploadsMap).toEqual({
        file1: expect.objectContaining(getMatchObject({ name: 'file1' })),
        file2: expect.objectContaining(getMatchObject({ name: 'file2' })),
        file3: expect.objectContaining(getMatchObject({ name: 'file3' })),
        file4: expect.objectContaining({
          name: 'file4',
          basename: 'file4',
          ext: 'jpg',
          size: 133788,
          mime: 'image/jpeg',
          type: 'image',
          field: 'file4',
          md5hash: '42f29c0d9d5f3ea807ef3c327f8c5890',
          original_basename: 'file4',
          original_name: 'file4',
          original_path: '/',
          original_md5hash: '42f29c0d9d5f3ea807ef3c327f8c5890',
        }),
      })
    })

    it('should allow setting an explicit assemblyId on createAssembly', async () => {
      const client = createClient()

      const assemblyId = randomUUID().replace(/-/g, '')
      const params = {
        assemblyId,
        waitForCompletion: true,
        params: {
          steps: {
            dummy: dummyStep,
          },
        },
      }

      const result = await createAssembly(client, params)
      expect(result.assembly_id).toEqual(assemblyId)
    })

    it('should allow getting the assemblyId on createAssembly even before it has been started', async () => {
      const client = createClient()

      const params = {
        params: {
          steps: {
            dummy: dummyStep,
          },
        },
      }

      const promise = createAssembly(client, params)
      expect(promise.assemblyId).toMatch(/^[\da-f]+$/)
      const result = await promise
      expect(result.assembly_id).toMatch(promise.assemblyId)
    })

    async function testUploadProgress() {
      const client = createClient()

      let progressCalled = false
      function onUploadProgress({ uploadedBytes, totalBytes }: UploadProgress) {
        // console.log(uploadedBytes)
        expect(uploadedBytes).toBeDefined()
        expect(totalBytes).toBeDefined()
        expect(totalBytes).toBeGreaterThan(0)
        progressCalled = true
      }

      const params: CreateAssemblyOptions = {
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

      await createAssembly(client, params)
      expect(progressCalled).toBe(true)
    }

    it('should trigger progress callbacks when uploading files', async () => {
      await testUploadProgress()
    })

    it('should return properly waitForCompletion is false', async () => {
      const client = createClient()
      const params = { ...genericOptions, waitForCompletion: false }

      const result = await createAssembly(client, params)
      expect(result).not.toHaveProperty('error')
      expect(result).toHaveProperty('ok')
    })

    it('should exit fast when assembly has failed', async () => {
      // An old bug caused it to continuously retry until timeout when errors such as
      // INVALID_FILE_META_DATA, INTERNAL_COMMAND_ERROR, INVALID_INPUT_ERROR
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

      const promise = createAssembly(client, opts)
      await promise.catch((err) => {
        expect(err).toMatchObject({
          code: 'INVALID_INPUT_ERROR',
          assemblyId: expect.any(String),
        })
      })
      await expect(promise).rejects.toThrow(Error)
    }, 60000)
  })

  describe('assembly cancelation', () => {
    it('should stop the assembly from reaching completion', async () => {
      const client = createClient()

      // We need to ensure that the assembly doesn't complete before it can be
      // canceled, so we start an http server for the assembly to import from,
      // and delay transmission of data until we've already sent the cancel
      // request

      // Async book-keeping for delaying the response
      let sendServerResponse!: () => void

      const promise = new Promise<void>((resolve) => {
        sendServerResponse = resolve
      })

      const handleRequest: RequestListener = async (req, res) => {
        // console.log('handler', req.url)

        expect(req.url).toBe('/')

        await promise

        // console.log('sending response')
        res.setHeader('Content-type', 'image/jpeg')
        res.writeHead(200)
        got.stream(genericImg).pipe(res)
      }

      const server = await createVirtualTestServer(handleRequest)

      try {
        // Finally send the createAssembly request
        const { assembly_id: id } = await createAssembly(client, {
          params: {
            steps: {
              import: {
                robot: '/http/import',
                url: server.url,
              },
              resize: {
                robot: '/image/resize',
                use: 'import',
                result: true,
                width: 130,
                height: 130,
              },
            },
          },
        })

        const awaitCompletionPromise = (async () => {
          try {
            expect(id).toBeDefined()
            const ret = await client.awaitAssemblyCompletion(nn(id, 'assembly_id'))
            return ret
          } catch (err) {
            console.error(err)
            return null
          }
        })()

        // Now delete it before uploading is done
        // console.log('canceling', id)
        expect(id).toBeDefined()
        const resp = await client.cancelAssembly(nn(id, 'assembly_id'))
        expect((resp as Extract<typeof resp, { ok: unknown }>).ok).toBe('ASSEMBLY_CANCELED')
        // console.log('canceled', id)

        // Allow the upload to finish
        sendServerResponse?.()

        // Successful cancel requests get ASSEMBLY_CANCELED even when it
        // completed, so we now request the assembly status to check the
        // *actual* status.
        expect(id).toBeDefined()
        const resp2 = await client.getAssembly(nn(id, 'assembly_id'))
        console.log(`Expect Assembly ${id} to return 'ASSEMBLY_CANCELED'`)
        expect((resp2 as Extract<typeof resp2, { ok: unknown }>).ok).toBe('ASSEMBLY_CANCELED')

        // Check that awaitAssemblyCompletion gave the correct response too
        const awaitCompletionResponse = await awaitCompletionPromise
        expect(awaitCompletionResponse).toBeDefined() // Ensure it's not null
        if (awaitCompletionResponse) {
          // Type guard
          expect(
            (awaitCompletionResponse as Extract<typeof awaitCompletionResponse, { ok: unknown }>)
              .ok,
          ).toBe('ASSEMBLY_CANCELED')
        } else {
          throw new Error('awaitCompletionResponse was null or undefined')
        }
      } finally {
        server.close()
      }
    })
  })

  describe('replaying assemblies', () => {
    it('should replay an assembly and await the replay', async () => {
      const client = createClient()

      const createdAssembly = await createAssembly(client, genericOptions)
      expect(createdAssembly.assembly_id).toBeDefined()
      const replayedAssembly = await client.replayAssembly(
        nn(createdAssembly.assembly_id, 'assembly_id'),
      )
      expect((replayedAssembly as Extract<typeof replayedAssembly, { ok: unknown }>).ok).toBe(
        'ASSEMBLY_REPLAYING',
      )
      expect(replayedAssembly.assembly_id).not.toEqual(createdAssembly.assembly_id)
      expect(replayedAssembly.assembly_url).toBeDefined()
      expect(replayedAssembly.assembly_ssl_url).toBeDefined()

      expect(replayedAssembly.assembly_id).toBeDefined()
      const result2 = await client.awaitAssemblyCompletion(
        nn(replayedAssembly.assembly_id, 'assembly_id'),
      )
      expect((result2 as Extract<typeof result2, { ok: unknown }>).ok).toBe('ASSEMBLY_COMPLETED')
    })
  })

  describe('assembly list retrieval', () => {
    it('should retrieve a list of assemblies', async () => {
      const client = createClient()

      const result = await client.listAssemblies()
      expect(result).toEqual(
        expect.objectContaining({ count: expect.any(Number), items: expect.any(Array) }),
      )
    })

    it('should be able to handle pagination with a stream', async () => {
      const client = createClient()
      const assemblies = client.streamAssemblies({ pagesize: 2 })
      let n = 0
      let isDone = false

      await new Promise<void>((resolve) => {
        assemblies.on('readable', () => {
          const assembly = assemblies.read()

          if (isDone) return

          if (assembly == null) {
            resolve()
            return
          }

          if (n === 5) {
            isDone = true
            resolve()
            return
          }

          expect(assembly).toHaveProperty('id')
          n++
        })
      })
    })
  })

  describe('assembly notification', { retry: 2 }, () => {
    type OnNotification = (params: {
      path?: string
      client: Transloadit
      assemblyId: string
    }) => void

    let server: VirtualTestServer
    afterEach(() => {
      server?.close()
    })

    // helper function
    const streamToString = (stream: IncomingMessage) =>
      new Promise<string>((resolve, reject) => {
        const chunks: string[] = []
        stream.on('data', (chunk) => chunks.push(chunk))
        stream.on('error', (err) => reject(err))
        stream.on('end', () => resolve(chunks.join('')))
      })

    const runNotificationTest = async (
      onNotification: OnNotification,
      onError: (error: unknown) => void,
    ) => {
      const client = createClient()

      // listens for notifications
      const onNotificationRequest: RequestListener = async (req, res) => {
        try {
          expect(req.method).toBe('POST')
          const body = await streamToString(req)
          const result = JSON.parse((parse(body) as { transloadit: string }).transloadit)
          expect(result).toHaveProperty('ok')
          if (result.ok !== 'ASSEMBLY_COMPLETED') {
            onError(new Error(`result.ok was ${result.ok}`))
            return
          }

          res.writeHead(200)
          res.end()

          onNotification({ path: req.url, client, assemblyId: result.assembly_id })
        } catch (err) {
          onError(err)
        }
      }

      try {
        server = await createVirtualTestServer(onNotificationRequest)
        await createAssembly(client, { params: { ...genericParams, notify_url: server.url } })
      } catch (err) {
        onError(err)
      }
    }

    it('should send a notification upon assembly completion', async () => {
      await new Promise<void>((resolve, reject) => {
        const onNotification: OnNotification = async ({ path }) => {
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

    it('should replay the notification when requested', async () => {
      let secondNotification = false

      await new Promise<void>((resolve, reject) => {
        const onNotification: OnNotification = async ({ path, client, assemblyId }) => {
          const newPath = '/newPath'
          const newUrl = `${server.url}${newPath}`

          // I think there are some eventual consistency issues here
          await setTimeout(1000)

          const result = await client.getAssembly(assemblyId)

          expect(['successful', 'processing']).toContain(result.notify_status)
          expect(result.notify_response_code).toBe(200)

          if (secondNotification) {
            expect(path).toBe(newPath)

            // notify_url will not get updated to new URL
            expect(result.notify_url).toBe(server.url)

            try {
              // If we quit immediately, things will not get cleaned up and jest will hang
              await setTimeout(2000)
              resolve()
            } catch (err) {
              reject(err)
            }

            return
          }

          secondNotification = true

          try {
            expect(path).toBe('/')
            expect(result.notify_url).toBe(server.url)

            await setTimeout(2000)
            await client.replayAssemblyNotification(assemblyId, { notify_url: newUrl })
          } catch (err) {
            reject(err)
          }
        }

        runNotificationTest(onNotification, reject)
      })
    })
  })

  describe('template methods', () => {
    // can contain only lowercase latin letters, numbers, and dashes.
    const templName = `node-sdk-test-${new Date()
      .toISOString()
      .toLocaleLowerCase('en-US')
      .replace(/[^0-9a-z-]/g, '-')}`
    let templId: string | null = null
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

      const template = await client.getTemplate(nn(templId, 'templId'))
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
      const editResult = await client.editTemplate(nn(templId, 'templId'), {
        name: editedName,
        template: editedTemplate,
      })
      expect(editResult.ok).toBe('TEMPLATE_UPDATED')
      expect(editResult.id).toBe(templId)
      expect(editResult.name).toBe(editedName)
      expect(editResult.content).toStrictEqual(editedTemplate)
    })

    it('should delete the template successfully', async () => {
      expect(templId).toBeDefined()

      const template = await client.deleteTemplate(nn(templId, 'templId'))
      const { ok } = template
      expect(ok).toBe('TEMPLATE_DELETED')
      await expect(client.getTemplate(nn(templId, 'templId'))).rejects.toThrow(
        expect.objectContaining({
          code: 'TEMPLATE_NOT_FOUND',
        }),
      )
    })
  })

  describe('credential methods', () => {
    // can contain only lowercase latin letters, numbers, and dashes.
    const credName = `node-sdk-test-${new Date()
      .toISOString()
      .toLocaleLowerCase('en-US')
      .replace(/[^0-9a-z-]/g, '-')}`
    let credId: string | null = null
    const client = createClient()

    it('should allow listing credentials', async () => {
      const listResult = await client.listTemplateCredentials()
      expect(listResult.ok).toBe('TEMPLATE_CREDENTIALS_FOUND')
      expect(listResult.credentials).toBeInstanceOf(Array)
    })

    it('should allow creating a credential', async () => {
      const createResult = await client.createTemplateCredential({
        type: 's3',
        name: credName,
        content: {
          key: 'xyxy',
          secret: 'xyxyxyxy',
          bucket: 'mybucket.example.com',
          bucket_region: 'us-east-1',
        },
      })
      credId = createResult.credential.id
    })

    it("should be able to fetch a credential's definition", async () => {
      expect(credId).toBeDefined()

      const readResult = await client.getTemplateCredential(nn(credId, 'credId'))
      const { name, content } = readResult.credential
      expect(name).toBe(credName)
      expect(content.bucket).toEqual('mybucket.example.com')
    })

    it('should allow editing a credential', async () => {
      expect(credId).toBeDefined()
      const editedName = `${credName}-edited`
      const editResult = await client.editTemplateCredential(nn(credId, 'credId'), {
        name: editedName,
        type: 's3',
        content: {
          key: 'foobar',
          secret: 'barfo',
          bucket: 'foo.bar.com',
          bucket_region: 'us-east-1',
        },
      })
      expect(editResult.ok).toBe('TEMPLATE_CREDENTIALS_UPDATED')
      expect(editResult.credential.id).toBe(credId)
      expect(editResult.credential.name).toBe(editedName)
      expect(editResult.credential.content.bucket).toEqual('foo.bar.com')
    })

    it('should delete the credential successfully', async () => {
      expect(credId).toBeDefined()

      const credential = await client.deleteTemplateCredential(nn(credId, 'credId'))
      const { ok } = credential
      expect(ok).toBe('TEMPLATE_CREDENTIALS_DELETED')
      await expect(client.getTemplateCredential(nn(credId, 'credId'))).rejects.toThrow(
        expect.objectContaining({
          code: 'TEMPLATE_CREDENTIALS_NOT_READ',
        }),
      )
    })
  })
})
