// @vitest-environment node

import { afterEach, expect, test, vi } from 'vitest'

import {
  decodeDocumentText,
  documentPreviewKind,
  MAX_DOCUMENT_PREVIEW_BYTES,
  readDocumentPreview,
  viewerKind,
} from '../src/document.ts'

afterEach(() => vi.unstubAllGlobals())

test.each([
  ['application/pdf', 'report.pdf', 'pdf'],
  ['application/octet-stream', 'report.pdf', 'pdf'],
  [null, 'report.pdf', 'pdf'],
  ['text/markdown', 'README', 'markdown'],
  ['text/x-markdown; charset=utf-8', 'README', 'markdown'],
  ['text/plain', 'NOTES.MD', 'markdown'],
  ['application/octet-stream', 'notes.txt', 'text'],
  [null, 'README.md', 'markdown'],
  ['application/rtf', 'letter.rtf', 'rtf'],
  ['text/rtf', 'letter', 'rtf'],
  ['text/plain', 'notes.txt', 'text'],
  ['application/json', 'dataset', 'text'],
  ['text/csv', 'sheet', 'text'],
  [null, 'server.LOG', 'text'],
  [null, 'notes.MDOWN', 'markdown'],
  [null, 'sheet.CSV', 'text'],
  [null, 'config.yml', 'text'],
  [null, 'config.yaml', 'text'],
  [null, 'data.json', 'text'],
  ['image/png', 'wrong.md', null],
  ['text/html', 'page.md', null],
  ['application/zip', 'archive.txt', null],
  ['application/octet-stream', 'unknown.exe', null],
])('classifies %s %s as %s', (mime, filename, expected) => {
  expect(documentPreviewKind(mime, filename)).toBe(expected)
})

test('reads a bounded stream with split UTF-8 characters and no advertised length', async () => {
  const bytes = new TextEncoder().encode('Hello 🌍')
  const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
    new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(bytes.subarray(0, 8))
          controller.enqueue(bytes.subarray(8))
          controller.close()
        },
      }),
    ),
  )
  vi.stubGlobal('fetch', fetch)
  expect(
    decodeDocumentText(
      await readDocumentPreview('https://workspace.tlcdn.com/signed', new AbortController().signal),
    ),
  ).toBe('Hello 🌍')
  expect(fetch).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({ credentials: 'omit', referrerPolicy: 'no-referrer' }),
  )
})

test('cancels a stream that exceeds the preview limit despite a smaller advertised length', async () => {
  const cancel = vi.fn()
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array(MAX_DOCUMENT_PREVIEW_BYTES + 1))
          },
          cancel,
        }),
        { headers: { 'content-length': '1' } },
      ),
    ),
  )
  await expect(
    readDocumentPreview('https://cdn.invalid', new AbortController().signal),
  ).rejects.toMatchObject({ reason: 'too-large' })
  expect(cancel).toHaveBeenCalledOnce()
})

test('does not read a document whose advertised size already exceeds the limit', async () => {
  const cancel = vi.fn()
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>().mockResolvedValue(
      new Response(new ReadableStream({ cancel }), {
        headers: { 'content-length': String(MAX_DOCUMENT_PREVIEW_BYTES + 1) },
      }),
    ),
  )
  await expect(
    readDocumentPreview('https://cdn.invalid', new AbortController().signal),
  ).rejects.toMatchObject({ reason: 'too-large' })
  expect(cancel).toHaveBeenCalledOnce()
})

test.each([
  401, 403, 404, 500,
])('returns a safe category for HTTP %s without exposing its body', async (status) => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('private diagnostics and signed URL', { status })),
  )
  await expect(
    readDocumentPreview('https://cdn.invalid?sig=secret', new AbortController().signal),
  ).rejects.toMatchObject({
    reason: status === 401 || status === 403 ? 'expired' : 'unavailable',
  })
})

test('decodes UTF-16 byte-order marks without showing the BOM', () => {
  expect(decodeDocumentText(Uint8Array.from([255, 254, 72, 0, 105, 0]).buffer)).toBe('Hi')
  expect(decodeDocumentText(Uint8Array.from([254, 255, 0, 72, 0, 105]).buffer)).toBe('Hi')
})

test.each([
  ['IMAGE/png', 'image'],
  ['audio/mpeg', 'audio'],
  ['video/mp4', 'video'],
  ['text/markdown', 'markdown'],
  ['application/octet-stream', 'pdf'],
  ['text/html', null],
])('viewerKind handles %s', (mime, kind) => expect(viewerKind(mime, 'slides.pdf')).toBe(kind))

test('decodes a quoted MIME charset and prefers an explicit Unicode BOM', () => {
  expect(
    decodeDocumentText(Uint8Array.of(0xe9).buffer, 'text/plain; Charset = "windows-1252"'),
  ).toBe('é')
  expect(
    decodeDocumentText(Uint8Array.of(0xff, 0xfe, 0x48, 0).buffer, 'text/plain; charset=ascii'),
  ).toBe('H')
  expect(
    decodeDocumentText(new TextEncoder().encode('é').buffer, 'text/plain; charset=unknown'),
  ).toBe('é')
})
