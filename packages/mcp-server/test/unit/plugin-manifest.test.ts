import { readFile } from 'node:fs/promises'

import { describe, expect, it } from 'vitest'
import { z } from 'zod'

// Kept as a URL so checkout paths with `#` or spaces resolve correctly.
const packageRoot = new URL('../../', import.meta.url)

const httpsUrlSchema = z.url({ protocol: /^https$/ })

/** The listing limits OpenAI's plugin submission enforces. */
const interfaceSchema = z.object({
  displayName: z.string().max(30),
  shortDescription: z.string().max(30),
  longDescription: z.string().max(4000),
  websiteURL: httpsUrlSchema,
  supportURL: httpsUrlSchema,
  privacyPolicyURL: httpsUrlSchema,
  termsOfServiceURL: httpsUrlSchema,
  defaultPrompt: z.array(z.string().max(128)).max(3),
  composerIcon: z.string(),
  logo: z.string(),
  screenshots: z.array(z.string()).default([]),
})

type PluginInterface = z.infer<typeof interfaceSchema>

const readJson = async (path: string): Promise<unknown> =>
  JSON.parse(await readFile(new URL(path, packageRoot), 'utf8'))

const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

/** Plugin submission rejects asset paths that are not images, and icons that are not square. */
const expectSquarePng = async (assetPath: string): Promise<void> => {
  const bytes = await readFile(new URL(assetPath, packageRoot))
  expect([...bytes.subarray(0, 8)], assetPath).toEqual(pngSignature)
  // The IHDR chunk always comes first and stores width and height as big-endian integers.
  const width = bytes.readUInt32BE(16)
  const height = bytes.readUInt32BE(20)
  expect(width, assetPath).toBe(height)
  expect(width, assetPath).toBeGreaterThanOrEqual(48)
}

const expectPng = async (assetPath: string): Promise<void> => {
  const bytes = await readFile(new URL(assetPath, packageRoot))
  expect([...bytes.subarray(0, 8)], assetPath).toEqual(pngSignature)
}

const expectSubmittableListing = async (listing: PluginInterface): Promise<void> => {
  await expectSquarePng(listing.composerIcon)
  await expectSquarePng(listing.logo)
  await Promise.all(listing.screenshots.map(expectPng))
  // OpenAI rejects listings that mention pricing or plans to upgrade to.
  expect(listing.longDescription).not.toMatch(/\b(free|pric(e|es|ing)|trial|upgrade)\b/i)
}

describe('plugin manifests', () => {
  it('meet the ChatGPT listing requirements', async () => {
    const manifest = z
      .object({ extensions: z.object({ 'com.openai': z.object({ interface: interfaceSchema }) }) })
      .parse(await readJson('plugin.json'))

    await expectSubmittableListing(manifest.extensions['com.openai'].interface)
  })

  it('meet the Codex listing requirements', async () => {
    const manifest = z
      .object({ interface: interfaceSchema })
      .parse(await readJson('.codex-plugin/plugin.json'))

    await expectSubmittableListing(manifest.interface)
  })
})
