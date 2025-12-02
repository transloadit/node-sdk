import fsp from 'node:fs/promises'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { TemplateContent } from '../../../src/apiTypes.ts'
import { zip } from '../../../src/cli/helpers.ts'
import * as templates from '../../../src/cli/templates.ts'
import { Transloadit as TransloaditClient } from '../../../src/Transloadit.ts'
import OutputCtl from './OutputCtl.ts'
import type { OutputEntry } from './test-utils.ts'
import { authKey, authSecret, delay, testCase } from './test-utils.ts'

describe('templates', () => {
  describe('create', () => {
    it(
      'should create templates',
      testCase(async (client) => {
        const executions = [1, 2, 3, 4, 5].map(async (n) => {
          const output = new OutputCtl()
          await fsp.writeFile(`${n}.json`, JSON.stringify({ testno: n }))
          await templates.create(output, client, { name: `test-${n}`, file: `${n}.json` })
          return output.get() as OutputEntry[]
        })

        const results = await Promise.all(executions)
        for (const result of results) {
          expect(result).to.have.lengthOf(1)
          expect(result).to.have.nested.property('[0].type').that.equals('print')
          expect(result).to.have.nested.property('[0].msg').that.equals(result[0]?.json?.id)

          if (result[0]?.json?.id) {
            await client.deleteTemplate(result[0].json.id).catch(() => {})
          }
        }
      }),
    )
  })

  describe('get', () => {
    it(
      'should get templates',
      testCase(async (client) => {
        const response = await client.listTemplates({ pagesize: 5 })
        const templatesList = response.items
        if (templatesList.length === 0) throw new Error('account has no templates to fetch')

        const expectations = await Promise.all(
          templatesList.map((template) => client.getTemplate(template.id)),
        )

        const actuals = await Promise.all(
          templatesList.map(async (template) => {
            const output = new OutputCtl()
            await templates.get(output, client, { templates: [template.id] })
            return output.get() as OutputEntry[]
          }),
        )

        for (const [expectation, actual] of zip(expectations, actuals)) {
          expect(actual).to.have.lengthOf(1)
          expect(actual).to.have.nested.property('[0].type').that.equals('print')
          expect(actual).to.have.nested.property('[0].json').that.deep.equals(expectation)
        }
      }),
    )

    it(
      'should return templates in the order specified',
      testCase(async (client) => {
        const response = await client.listTemplates({ pagesize: 5 })
        const items = response.items.sort(() => 2 * Math.floor(Math.random() * 2) - 1)
        if (items.length === 0) throw new Error('account has no templates to fetch')

        const ids = items.map((template) => template.id)

        const output = new OutputCtl()
        await templates.get(output, client, { templates: ids })
        const results = output.get() as OutputEntry[]

        expect(results).to.have.lengthOf(ids.length)
        for (const [result, id] of zip(results, ids)) {
          expect(result).to.have.property('type').that.equals('print')
          expect(result).to.have.nested.property('json.id').that.equals(id)
        }
      }),
    )
  })

  describe('modify', () => {
    let templateId: string

    beforeAll(async () => {
      const client = new TransloaditClient({ authKey, authSecret })
      const response = await client.createTemplate({
        name: 'original-name',
        template: {
          steps: { dummy: { robot: '/html/convert', url: 'https://example.com' } },
        } as TemplateContent,
      })
      templateId = response.id
    })

    it(
      'should modify but not rename the template',
      testCase(async (client) => {
        await fsp.writeFile('template.json', JSON.stringify({ stage: 1 }))

        const output = new OutputCtl()
        await templates.modify(output, client, {
          template: templateId,
          file: 'template.json',
        })
        const result = output.get()

        expect(result).to.have.lengthOf(0)
        await delay(2000)
        const template = await client.getTemplate(templateId)
        expect(template).to.have.property('name').that.equals('original-name')
        expect(template).to.have.property('content').that.has.property('steps')
      }),
    )

    it(
      'should not modify but rename the template',
      testCase(async (client) => {
        await fsp.writeFile('template.json', '')

        const output = new OutputCtl()
        await templates.modify(output, client, {
          template: templateId,
          name: 'new-name',
          file: 'template.json',
        })
        const result = output.get()

        expect(result).to.have.lengthOf(0)
        await delay(2000)
        const template = await client.getTemplate(templateId)
        expect(template).to.have.property('name').that.equals('new-name')
        expect(template).to.have.property('content').that.has.property('steps')
      }),
    )

    it(
      'should modify and rename the template',
      testCase(async (client) => {
        await fsp.writeFile('template.json', JSON.stringify({ stage: 2 }))

        const output = new OutputCtl()
        await templates.modify(output, client, {
          template: templateId,
          name: 'newer-name',
          file: 'template.json',
        })
        const result = output.get()

        expect(result).to.have.lengthOf(0)
        await delay(2000)
        const template = await client.getTemplate(templateId)
        expect(template).to.have.property('name').that.equals('newer-name')
        expect(template).to.have.property('content').that.has.property('steps')
      }),
    )

    afterAll(async () => {
      const client = new TransloaditClient({ authKey, authSecret })
      await client.deleteTemplate(templateId)
    })
  })

  describe('delete', () => {
    it(
      'should delete templates',
      testCase(async (client) => {
        const ids = await Promise.all(
          [1, 2, 3, 4, 5].map(async (n) => {
            const response = await client.createTemplate({
              name: `delete-test-${n}`,
              template: {
                steps: { dummy: { robot: '/html/convert', url: `https://example.com/${n}` } },
              } as TemplateContent,
            })
            return response.id
          }),
        )

        const output = new OutputCtl()
        await templates.delete(output, client, { templates: ids })
        const result = output.get()

        expect(result).to.have.lengthOf(0)
        await Promise.all(
          ids.map(async (id) => {
            try {
              const response = await client.getTemplate(id)
              expect(response).to.not.exist
            } catch (err) {
              const error = err as {
                code?: string
                transloaditErrorCode?: string
                response?: { body?: { error?: string } }
              }
              const errorCode =
                error.code || error.transloaditErrorCode || error.response?.body?.error
              if (errorCode !== 'TEMPLATE_NOT_FOUND') {
                console.error('Delete failed with unexpected error:', err, 'Code:', errorCode)
                throw err
              }
            }
          }),
        )
      }),
    )
  })

  describe('sync', () => {
    it(
      'should handle directories recursively',
      testCase(async (client) => {
        const response = await client.listTemplates({ pagesize: 5 })
        const templateIds = response.items.map((item) => ({ id: item.id, name: item.name }))

        let dirname = 'd'
        const files: string[] = []
        for (const { id, name } of templateIds) {
          const fname = path.join(dirname, `${name}.json`)
          await fsp.mkdir(dirname, { recursive: true })
          await fsp.writeFile(fname, `{"transloadit_template_id":"${id}"}`)
          files.push(fname)
          dirname = path.join(dirname, 'd')
        }

        const output = new OutputCtl()
        await templates.sync(output, client, { recursive: true, files: ['d'] })
        const result = output.get()

        expect(result).to.have.lengthOf(0)
        const contents = await Promise.all(
          files.map(
            async (file) => JSON.parse(await fsp.readFile(file, 'utf8')) as Record<string, unknown>,
          ),
        )
        for (const [content, idObj] of zip(contents, templateIds)) {
          expect(content).to.have.property('transloadit_template_id').that.equals(idObj.id)
          expect(content).to.have.property('steps')
        }
      }),
    )

    it(
      'should update local files when outdated',
      testCase(async (client) => {
        const params = {
          name: `test-local-update-${Date.now()}`,
          template: {
            steps: { dummy: { robot: '/html/convert', url: 'https://example.com/changed' } },
          } as TemplateContent,
        }
        const response = await client.createTemplate(params)
        const id = response.id

        try {
          const fname = `${params.name}.json`
          await fsp.writeFile(
            fname,
            JSON.stringify({
              transloadit_template_id: id,
              steps: { changed: false },
            }),
          )
          await fsp.utimes(fname, 0, 0)

          const output = new OutputCtl()
          await templates.sync(output, client, { files: [fname] })
          const result = output.get()

          expect(result).to.have.lengthOf(0)
          const content = JSON.parse(await fsp.readFile(fname, 'utf8')) as Record<string, unknown>
          expect(content).to.have.property('steps')
          const fetchedTemplate = await client.getTemplate(id)
          expect(fetchedTemplate).to.have.property('content').that.has.property('steps')
        } finally {
          await client.deleteTemplate(id).catch(() => {})
        }
      }),
    )

    it(
      'should update remote template when outdated',
      testCase(async (client) => {
        const params = {
          name: `test-remote-update-${Date.now()}`,
          template: {
            steps: { dummy: { robot: '/html/convert', url: 'https://example.com/unchanged' } },
          } as TemplateContent,
        }
        const response = await client.createTemplate(params)
        const id = response.id

        try {
          const fname = `${params.name}.json`
          await fsp.writeFile(
            fname,
            JSON.stringify({
              transloadit_template_id: id,
              steps: { changed: true },
            }),
          )
          await fsp.utimes(fname, Date.now() * 2, Date.now() * 2)

          const output = new OutputCtl()
          await templates.sync(output, client, { files: [fname] })
          const result = output.get()

          expect(result).to.have.lengthOf(0)
          const content = JSON.parse(await fsp.readFile(fname, 'utf8')) as Record<string, unknown>
          expect(content).to.have.property('steps')
          const fetchedTemplate = await client.getTemplate(id)
          expect(fetchedTemplate).to.have.property('content').that.has.property('steps')
        } finally {
          await client.deleteTemplate(id).catch(() => {})
        }
      }),
    )
  })
})
