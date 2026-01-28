import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import { writeFile } from 'node:fs/promises'
import type { IncomingMessage } from 'node:http'
import { createServer } from 'node:http'
import { basename } from 'node:path'
import temp from 'temp'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Transloadit } from '../../src/Transloadit.ts'

type TusUpload = {
  id: string
  fieldname: string
  filename: string
  size: number
  offset: number
  finished: boolean
}

const tusResumable = '1.0.0'

function parseMetadata(value: string | undefined): Record<string, string> {
  if (!value) return {}
  const entries = value.split(',')
  const metadata: Record<string, string> = {}
  for (const entry of entries) {
    const [key, encoded] = entry.trim().split(' ')
    if (!key || !encoded) continue
    metadata[key] = Buffer.from(encoded, 'base64').toString('utf8')
  }
  return metadata
}

async function readBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks)
}

async function createTmpFile(contents: string): Promise<string> {
  const { path } = await temp.open('transloadit-resume')
  await writeFile(path, contents, 'utf8')
  return path
}

describe('assembly resume', () => {
  const assemblyId = randomUUID().replaceAll('-', '')
  const uploads = new Map<string, TusUpload>()
  const postCounts = new Map<string, number>()

  let baseUrl = ''
  let server: ReturnType<typeof createServer>

  beforeAll(async () => {
    server = createServer(async (req, res) => {
      if (!req.url) {
        res.statusCode = 400
        res.end('missing url')
        return
      }

      const url = new URL(req.url, baseUrl)

      if (url.pathname.startsWith('/assemblies/')) {
        const id = url.pathname.split('/').pop() ?? ''
        if (id !== assemblyId) {
          res.statusCode = 404
          res.end('not found')
          return
        }

        const tusUploads = [...uploads.values()].map((upload) => ({
          id: upload.id,
          filename: upload.filename,
          fieldname: upload.fieldname,
          size: upload.size,
          offset: upload.offset,
          finished: upload.finished,
          upload_url: `${baseUrl}/tus/${upload.id}`,
        }))

        const result = {
          ok: 'ASSEMBLY_UPLOADING',
          assembly_id: assemblyId,
          assembly_url: `${baseUrl}/assemblies/${assemblyId}`,
          assembly_ssl_url: `${baseUrl}/assemblies/${assemblyId}`,
          tus_url: `${baseUrl}/tus`,
          tus_uploads: tusUploads,
          uploads: tusUploads
            .filter((upload) => upload.finished)
            .map((upload) => ({
              id: upload.id,
              name: upload.filename,
              basename: upload.filename,
              ext: upload.filename.split('.').pop() ?? '',
              size: upload.size,
              mime: null,
              type: null,
              field: upload.fieldname,
              md5hash: null,
              original_id: upload.id,
              original_basename: upload.filename,
              original_name: upload.filename,
              original_path: upload.filename,
              original_md5hash: null,
              from_batch_import: false,
              is_tus_file: true,
              tus_upload_url: `${baseUrl}/tus/${upload.id}`,
              url: null,
              ssl_url: null,
              meta: {},
            })),
        }

        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(result))
        return
      }

      if (url.pathname === '/tus' && req.method === 'OPTIONS') {
        res.statusCode = 204
        res.setHeader('Tus-Resumable', tusResumable)
        res.setHeader('Tus-Version', tusResumable)
        res.setHeader('Tus-Extension', 'creation,creation-defer-length')
        res.end()
        return
      }

      if (url.pathname === '/tus' && req.method === 'POST') {
        const metadata = parseMetadata(req.headers['upload-metadata'] as string | undefined)
        const size = Number(req.headers['upload-length'] ?? 0)
        const fieldname = metadata.fieldname ?? 'file'
        const filename = metadata.filename ?? fieldname
        const id = randomUUID()
        uploads.set(id, {
          id,
          fieldname,
          filename,
          size,
          offset: 0,
          finished: false,
        })
        postCounts.set(fieldname, (postCounts.get(fieldname) ?? 0) + 1)
        res.statusCode = 201
        res.setHeader('Tus-Resumable', tusResumable)
        res.setHeader('Location', `/tus/${id}`)
        res.end()
        return
      }

      if (url.pathname.startsWith('/tus/') && req.method === 'HEAD') {
        const id = url.pathname.split('/').pop() ?? ''
        const upload = uploads.get(id)
        if (!upload) {
          res.statusCode = 404
          res.end()
          return
        }
        res.statusCode = 200
        res.setHeader('Tus-Resumable', tusResumable)
        res.setHeader('Upload-Offset', String(upload.offset))
        res.setHeader('Upload-Length', String(upload.size))
        res.end()
        return
      }

      if (url.pathname.startsWith('/tus/') && req.method === 'PATCH') {
        const id = url.pathname.split('/').pop() ?? ''
        const upload = uploads.get(id)
        if (!upload) {
          res.statusCode = 404
          res.end()
          return
        }
        const body = await readBody(req)
        upload.offset += body.length
        if (upload.offset >= upload.size) {
          upload.offset = upload.size
          upload.finished = true
        }
        res.statusCode = 204
        res.setHeader('Tus-Resumable', tusResumable)
        res.setHeader('Upload-Offset', String(upload.offset))
        res.end()
        return
      }

      res.statusCode = 404
      res.end()
    })

    server.listen(0, '127.0.0.1')
    await once(server, 'listening')
    const address = server.address()
    if (address && typeof address === 'object') {
      baseUrl = `http://127.0.0.1:${address.port}`
    }
  })

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })

  it('resumes uploads using assembly status', async () => {
    const file1Path = await createTmpFile('abcdef')
    const file2Path = await createTmpFile('wxyz')

    const file1Id = randomUUID()
    uploads.set(file1Id, {
      id: file1Id,
      fieldname: 'file1',
      filename: basename(file1Path),
      size: 6,
      offset: 3,
      finished: false,
    })

    const client = new Transloadit({
      authKey: 'key',
      authSecret: 'secret',
      endpoint: baseUrl,
    })

    await client.resumeAssemblyUploads({
      assemblyUrl: `${baseUrl}/assemblies/${assemblyId}`,
      files: {
        file1: file1Path,
        file2: file2Path,
      },
      uploadConcurrency: 1,
    })

    expect(postCounts.get('file1') ?? 0).toBe(0)
    expect(postCounts.get('file2') ?? 0).toBe(1)

    const completed = [...uploads.values()].filter((upload) => upload.finished)
    const completedFields = completed.map((upload) => upload.fieldname).sort()
    expect(completedFields).toEqual(['file1', 'file2'])
  })
})
