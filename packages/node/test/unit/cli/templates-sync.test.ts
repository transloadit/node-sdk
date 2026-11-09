import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, expect, it, vi } from 'vitest'

import { sync } from '../../../src/cli/commands/templates.ts'
import OutputCtl from '../../../src/cli/OutputCtl.ts'

const directories: string[] = []

afterEach(async () => {
  vi.restoreAllMocks()
  await Promise.all(directories.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

async function templateFile(steps: unknown): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), 'transloadit-template-sync-'))
  directories.push(dir)
  const file = path.join(dir, 'extracted.json')
  await writeFile(file, JSON.stringify({ transloadit_template_id: '', steps }))
  return file
}

it('syncs OCR templates whose provider is supplied by Assembly overrides, with a warning', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  const step = { robot: '/document/extract', use: ':original', text_method: 'ocr' }
  const file = await templateFile({ extracted: step })
  const output = new OutputCtl()
  const warning = vi.spyOn(output, 'warn')
  const client = { createTemplate: vi.fn().mockResolvedValue({ id: 'created-template' }) }

  await sync(output, client as never, { files: [file] })

  expect(warning).toHaveBeenCalledWith(expect.stringContaining('extracted.ocr_provider'))
  expect(client.createTemplate).toHaveBeenCalledWith({
    name: 'extracted',
    template: { steps: { extracted: expect.objectContaining(step) } },
  })
  expect(JSON.parse(await readFile(file, 'utf8'))).toMatchObject({
    transloadit_template_id: 'created-template',
    steps: { extracted: step },
  })
})

it('keeps invalid Storage selectors out of Template synchronization', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  const file = await templateFile({
    extracted: { robot: '/document/extract', text_method: 'ocr' },
    imported: { robot: '/transloadit/import' },
  })
  const client = { createTemplate: vi.fn() }

  await sync(new OutputCtl(), client as never, { files: [file] })

  expect(client.createTemplate).not.toHaveBeenCalled()
  expect(JSON.parse(await readFile(file, 'utf8')).transloadit_template_id).toBe('')
})
