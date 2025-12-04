import fsp from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import * as assemblies from '../../../src/cli/assemblies.ts'
import { zip } from '../../../src/cli/helpers.ts'
import OutputCtl from './OutputCtl.ts'
import type { OutputEntry } from './test-utils.ts'
import { testCase } from './test-utils.ts'

describe('assemblies', () => {
  describe('get', () => {
    it(
      'should get assemblies',
      testCase(async (client) => {
        const response = await client.listAssemblies({
          pagesize: 5,
          type: 'completed',
        })
        const assemblyList = response.items
        if (assemblyList.length === 0) throw new Error('account has no assemblies to fetch')

        const expectations = await Promise.all(
          assemblyList.map((assembly) => client.getAssembly(assembly.id)),
        )

        const actuals = await Promise.all(
          assemblyList.map(async (assembly) => {
            const output = new OutputCtl()
            await assemblies.get(output, client, { assemblies: [assembly.id] })
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
      'should return assemblies in the order specified',
      testCase(async (client) => {
        const response = await client.listAssemblies({ pagesize: 5 })
        const assemblyList = response.items.sort(() => 2 * Math.floor(Math.random() * 2) - 1)
        if (assemblyList.length === 0) throw new Error('account has no assemblies to fetch')

        const ids = assemblyList.map((assembly) => assembly.id)

        const output = new OutputCtl()
        await assemblies.get(output, client, { assemblies: ids })
        const results = output.get() as OutputEntry[]

        try {
          expect(results).to.have.lengthOf(ids.length)
        } catch (e) {
          console.error('DEBUG: Results:', JSON.stringify(results, null, 2))
          console.error('DEBUG: Ids:', JSON.stringify(ids, null, 2))
          throw e
        }
        for (const [result, id] of zip(results, ids)) {
          expect(result).to.have.property('type').that.equals('print')
          expect(result).to.have.nested.property('json.assembly_id').that.equals(id)
        }
      }),
    )
  })

  describe('delete', () => {
    it(
      'should delete assemblies',
      testCase(async (client) => {
        const assembly = await client.createAssembly({
          params: {
            steps: { import: { robot: '/http/import', url: 'https://placehold.co/100.jpg' } },
          },
        })

        const output = new OutputCtl()
        const assemblyId = assembly.assembly_id as string
        await assemblies.delete(output, client, { assemblies: [assemblyId] })
        const res = await client.getAssembly(assemblyId)
        expect(res.ok).to.equal('ASSEMBLY_CANCELED')
      }),
    )
  })

  describe('replay', () => {
    it(
      'should replay assemblies without steps (uses original)',
      testCase(async (client) => {
        const assembly = await client.createAssembly({
          params: {
            steps: { import: { robot: '/http/import', url: 'https://placehold.co/100.jpg' } },
          },
        })

        const output = new OutputCtl()
        const assemblyId = assembly.assembly_id as string
        await assemblies.replay(output, client, {
          assemblies: [assemblyId],
          steps: undefined,
        })
        const logs = output.get() as OutputEntry[]
        expect(logs.filter((l) => l.type === 'error')).to.have.lengthOf(0)
      }),
    )

    it(
      'should replay assemblies with steps override',
      testCase(async (client) => {
        // Create an assembly with 100x100 resize
        const assembly = await client.createAssembly({
          params: {
            steps: {
              import: { robot: '/http/import', url: 'https://placehold.co/100.jpg' },
              resize: {
                robot: '/image/resize',
                use: 'import',
                result: true,
                width: 50,
                height: 50,
              },
            },
          },
        })

        // Create steps file with different dimensions (80x80)
        const overrideSteps = {
          import: { robot: '/http/import', url: 'https://placehold.co/100.jpg' },
          resize: {
            robot: '/image/resize',
            use: 'import',
            result: true,
            width: 80,
            height: 80,
          },
        }
        await fsp.writeFile('override-steps.json', JSON.stringify(overrideSteps))

        const output = new OutputCtl()
        const assemblyId = assembly.assembly_id as string
        await assemblies.replay(output, client, {
          assemblies: [assemblyId],
          steps: 'override-steps.json',
        })
        const logs = output.get() as OutputEntry[]
        expect(logs.filter((l) => l.type === 'error')).to.have.lengthOf(0)

        // Note: We can't easily verify the output dimensions here without downloading,
        // but the test verifies the steps file is parsed and sent without errors
      }),
    )
  })
})
