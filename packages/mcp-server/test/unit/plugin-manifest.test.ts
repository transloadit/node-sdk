import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'
import { z } from 'zod'

const packageRoot = fileURLToPath(new URL('../../', import.meta.url))

const interfaceSchema = z.object({
  composerIcon: z.string(),
  logo: z.string(),
  screenshots: z.array(z.string()),
})

const readJson = async (path: string): Promise<unknown> =>
  JSON.parse(await readFile(new URL(path, `file://${packageRoot}`), 'utf8'))

const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

/** Plugin submission rejects manifests whose asset paths do not resolve to images. */
const expectPng = async (assetPath: string): Promise<void> => {
  const bytes = await readFile(new URL(assetPath, `file://${packageRoot}`))
  expect([...bytes.subarray(0, 8)], assetPath).toEqual(pngSignature)
}

describe('plugin manifests', () => {
  it('ship every image the ChatGPT manifest references', async () => {
    const manifest = z
      .object({ extensions: z.object({ 'com.openai': z.object({ interface: interfaceSchema }) }) })
      .parse(await readJson('plugin.json'))
    const { composerIcon, logo, screenshots } = manifest.extensions['com.openai'].interface

    await expectPng(composerIcon)
    await expectPng(logo)
    await Promise.all(screenshots.map(expectPng))
  })

  it('ship every image the Codex manifest references', async () => {
    const manifest = z
      .object({ interface: interfaceSchema })
      .parse(await readJson('.codex-plugin/plugin.json'))
    const { composerIcon, logo, screenshots } = manifest.interface

    await expectPng(composerIcon)
    await expectPng(logo)
    await Promise.all(screenshots.map(expectPng))
  })
})
