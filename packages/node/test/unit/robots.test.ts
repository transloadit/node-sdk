import { describe, expect, it } from 'vitest'

import {
  robotsSchema,
  robotsWithHiddenBotsAndFieldsSchema,
  robotsWithHiddenBotsSchema,
  robotsWithHiddenFieldsSchema,
} from '../../src/alphalib/types/robots/_index.ts'
import { stepSchema, stepSchemaWithHiddenFields } from '../../src/alphalib/types/template.ts'
import { getRobotHelp, listRobots } from '../../src/Transloadit.ts'

describe('robot catalog helpers', () => {
  it('exposes HTTP requests through the public catalog and offline help', () => {
    expect(listRobots({ search: '/http/request' }).robots).toEqual([
      expect.objectContaining({ name: '/http/request', category: 'code-evaluation' }),
    ])
    const help = getRobotHelp({ robotName: 'HttpRequestRobot', detailLevel: 'full' })
    expect(help.name).toBe('/http/request')
    expect(help.requiredParams.map((parameter) => parameter.name)).toEqual(['url'])
    expect(
      help.optionalParams.find((parameter) => parameter.name === 'payload')?.description,
    ).toContain('metadata')
    expect(help.examples).toEqual([expect.objectContaining({ snippet: expect.any(Object) })])
  })

  it.each([
    robotsSchema,
    robotsWithHiddenFieldsSchema,
    robotsWithHiddenBotsSchema,
    robotsWithHiddenBotsAndFieldsSchema,
    stepSchema,
    stepSchemaWithHiddenFields,
  ])('parses HTTP request defaults through every SDK registry', (schema) => {
    expect(schema.parse({ robot: '/http/request', url: 'https://example.com/hook' })).toMatchObject(
      {
        robot: '/http/request',
        method: 'POST',
        payload: 'none',
        headers: [],
        timeout: 60,
        max_response_size: 1024 * 1024,
        max_result_files: 10,
        max_result_file_size: 100 * 1024 * 1024,
        result_download_timeout: 120,
      },
    )
  })

  it.each([
    { url: 'ftp://example.com/hook' },
    { method: 'post' },
    { payload: 'invalid' },
    { timeout: 0 },
    { max_result_files: 101 },
  ])('rejects invalid HTTP request parameters %j', (parameters) => {
    const step = { robot: '/http/request', url: 'https://example.com/hook', ...parameters }
    expect(stepSchema.safeParse(step).success).toBe(false)
    expect(stepSchemaWithHiddenFields.safeParse(step).success).toBe(false)
  })

  it('keeps folder recursion documented in Storage import help', () => {
    const help = getRobotHelp({ robotName: '/transloadit/import', detailLevel: 'full' })
    expect(help.optionalParams.find((param) => param.name === 'recursive')?.description).toContain(
      'Whether to import files from subfolders and sub-subfolders',
    )
  })

  it.each([
    ['true', true],
    ['false', false],
  ])('normalizes recursive string %s for Storage path imports', (recursive, expected) => {
    const step = { robot: '/transloadit/import', path: 'photos/', recursive }
    expect(stepSchema.parse(step)).toMatchObject({ recursive: expected })
    expect(stepSchemaWithHiddenFields.parse(step)).toMatchObject({ recursive: expected })
  })

  it.each([
    {},
    { path: 'photos/cat.jpg', asset_id: 'AAAAAAAAAAAAAAAAAAAAAA' },
    { version_id: 'BBBBBBBBBBBBBBBBBBBBBA' },
    { asset_id: 'AAAAAAAAAAAAAAAAAAAAAA', recursive: true },
  ])('rejects invalid Storage import selectors: %j', (selector) => {
    const step = { robot: '/transloadit/import', ...selector }
    expect(stepSchema.safeParse(step).success).toBe(false)
    expect(stepSchemaWithHiddenFields.safeParse(step).success).toBe(false)
  })

  it('keeps nonrecursive ID imports valid after interpolation-aware parsing', () => {
    const step = { robot: '/transloadit/import', asset_id: '${fields.asset}', recursive: false }
    expect(stepSchema.parse(step)).toMatchObject(step)
    expect(stepSchemaWithHiddenFields.parse(step)).toMatchObject(step)
  })

  it.each([
    '/transloadit/store',
    '/transloadit/import',
  ])('documents the Storage robot %s offline', (robotName) => {
    const help = getRobotHelp({ robotName, detailLevel: 'full' })
    expect(help.name).toBe(robotName)
    expect([...help.requiredParams, ...help.optionalParams].map((param) => param.name)).toContain(
      'path',
    )
    expect(help.examples?.length).toBeGreaterThan(0)
  })

  it('explains a complete destination path for Storage exports', () => {
    const help = getRobotHelp({ robotName: '/transloadit/store', detailLevel: 'full' })
    const path = help.optionalParams.find((param) => param.name === 'path')
    expect(path?.description).toContain('folders and a filename')
    expect(path?.description).toContain('website/hero.jpg')
    expect(help.optionalParams.find((param) => param.name === 'conflict_strategy')).toBeDefined()
  })
  it('lists robots with searchable summaries', () => {
    const { robots, nextCursor } = listRobots({ search: 'image', limit: 3 })

    expect(robots.length).toBeGreaterThan(0)
    expect(robots[0]?.summary.length).toBeGreaterThan(0)
    for (const robot of robots) {
      const haystack = `${robot.name} ${robot.title ?? ''} ${robot.summary}`.toLowerCase()
      expect(haystack).toContain('image')
    }

    if (nextCursor) {
      expect(Number.parseInt(nextCursor, 10)).toBeGreaterThan(0)
    }
  })

  it('returns robot help and resolves class names', () => {
    const help = getRobotHelp({ robotName: 'ImageResizeRobot', detailLevel: 'full' })

    expect(help.name).toBe('/image/resize')
    expect(help.summary.length).toBeGreaterThan(0)
    expect(help.requiredParams.length + help.optionalParams.length).toBeGreaterThan(0)
  })

  it('returns full help including examples when available', () => {
    const help = getRobotHelp({ robotName: '/http/import', detailLevel: 'full' })

    expect(help.name).toBe('/http/import')
    expect(help.summary.length).toBeGreaterThan(0)
    expect(help.requiredParams.length + help.optionalParams.length).toBeGreaterThan(0)
    expect(Array.isArray(help.examples)).toBe(true)
    expect(help.examples?.length).toBeGreaterThan(0)
  })

  it('documents the image default, precision option, and existing OpenAI model', () => {
    const help = getRobotHelp({ robotName: '/image/generate', detailLevel: 'full' })
    const modelParam = help.optionalParams.find((param) => param.name === 'model')

    expect(modelParam?.description).toContain('Defaults to `openai/gpt-image-2.5-flare`.')
    expect(modelParam?.description).toContain('openai/gpt-image-2.5-sunburst')
    expect(modelParam?.description).toContain('`openai/gpt-image-2`,')
  })
})
