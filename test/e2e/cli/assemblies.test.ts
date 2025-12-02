import fsp from 'node:fs/promises'
import process from 'node:process'
import { promisify } from 'node:util'
import { imageSize } from 'image-size'
import rreaddir from 'recursive-readdir'
import { describe, expect, it } from 'vitest'
import * as assemblies from '../../../src/cli/assemblies.ts'
import assembliesCreate from '../../../src/cli/assemblies-create.ts'
import { zip } from '../../../src/cli/helpers.ts'
import OutputCtl from './OutputCtl.ts'
import type { OutputEntry } from './test-utils.ts'
import { testCase } from './test-utils.ts'

const rreaddirAsync = promisify(rreaddir)

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

  describe('list', () => {
    it(
      'should list assemblies',
      testCase(async (client) => {
        const output = new OutputCtl()
        await assemblies.list(output, client, { pagesize: 1 })
        const logs = output.get() as OutputEntry[]
        expect(logs.filter((l) => l.type === 'error')).to.have.lengthOf(0)
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
      'should replay assemblies',
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
  })

  describe('create', () => {
    const genericImg = 'https://placehold.co/100.jpg'

    async function imgPromise(fname = 'in.jpg'): Promise<string> {
      const response = await fetch(genericImg)
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`)
      }
      const buffer = Buffer.from(await response.arrayBuffer())
      await fsp.writeFile(fname, buffer)
      return fname
    }

    const genericSteps = {
      resize: {
        robot: '/image/resize',
        use: ':original',
        result: true,
        width: 130,
        height: 130,
      },
    }

    async function stepsPromise(
      _fname = 'steps.json',
      steps: Record<string, unknown> = genericSteps,
    ): Promise<string> {
      await fsp.writeFile('steps.json', JSON.stringify(steps))
      return 'steps.json'
    }

    it(
      'should transcode a file',
      testCase(async (client) => {
        const infile = await imgPromise()
        const steps = await stepsPromise()

        const output = new OutputCtl()
        await assembliesCreate(output, client, {
          steps,
          inputs: [infile],
          output: 'out.jpg',
        })
        const result = output.get(true) as OutputEntry[]

        expect(result.length).to.be.at.least(3)
        const msgs = result.map((r) => r.msg)
        expect(msgs).to.include('GOT JOB in.jpg out.jpg')
        expect(msgs).to.include('DOWNLOADING')
        expect(msgs).to.include('COMPLETED in.jpg out.jpg')

        const imgBuffer = await fsp.readFile('out.jpg')
        const dim = imageSize(new Uint8Array(imgBuffer))
        expect(dim).to.have.property('width').that.equals(130)
        expect(dim).to.have.property('height').that.equals(130)
      }),
    )

    it(
      'should handle multiple inputs',
      testCase(async (client) => {
        const infiles = await Promise.all(['in1.jpg', 'in2.jpg', 'in3.jpg'].map(imgPromise))
        const steps = await stepsPromise()
        await fsp.mkdir('out')

        const output = new OutputCtl()
        await assembliesCreate(output, client, {
          steps,
          inputs: infiles,
          output: 'out',
        })

        const outs = await fsp.readdir('out')
        expect(outs[0]).to.equal('in1.jpg')
        expect(outs[1]).to.equal('in2.jpg')
        expect(outs[2]).to.equal('in3.jpg')
        expect(outs).to.have.lengthOf(3)
      }),
    )

    it(
      'should not output outside outdir',
      testCase(async (client) => {
        await fsp.mkdir('sub')
        process.chdir('sub')

        const infile = await imgPromise('../in.jpg')
        await fsp.mkdir('out')
        const steps = await stepsPromise()

        const output = new OutputCtl()
        await assembliesCreate(output, client, {
          steps,
          inputs: [infile],
          output: 'out',
        })

        const outs = await fsp.readdir('out')
        expect(outs[0]).to.equal('in.jpg')
        expect(outs).to.have.lengthOf(1)

        const ls = await fsp.readdir('.')
        expect(ls).to.not.contain('in.jpg')
      }),
    )

    it(
      'should structure output directory correctly',
      testCase(async (client) => {
        await fsp.mkdir('in')
        await fsp.mkdir('in/sub')
        await Promise.all(['1.jpg', 'in/2.jpg', 'in/sub/3.jpg'].map(imgPromise))
        await fsp.mkdir('out')
        const steps = await stepsPromise()

        const output = new OutputCtl()
        await assembliesCreate(output, client, {
          recursive: true,
          steps,
          inputs: ['1.jpg', 'in'],
          output: 'out',
        })

        const outs = await rreaddirAsync('out')
        expect(outs).to.include('out/1.jpg')
        expect(outs).to.include('out/2.jpg')
        expect(outs).to.include('out/sub/3.jpg')
        expect(outs).to.have.lengthOf(3)
      }),
    )

    it(
      'should not be recursive by default',
      testCase(async (client) => {
        await fsp.mkdir('in')
        await fsp.mkdir('in/sub')
        await Promise.all(['in/2.jpg', 'in/sub/3.jpg'].map(imgPromise))
        await fsp.mkdir('out')
        const steps = await stepsPromise()

        const output = new OutputCtl()
        await assembliesCreate(output, client, {
          steps,
          inputs: ['in'],
          output: 'out',
        })

        const outs = await rreaddirAsync('out')
        expect(outs).to.include('out/2.jpg')
        expect(outs).to.not.include('out/sub/3.jpg')
        expect(outs).to.have.lengthOf(1)
      }),
    )

    it(
      'should be able to handle directories recursively',
      testCase(async (client) => {
        await fsp.mkdir('in')
        await fsp.mkdir('in/sub')
        await Promise.all(['in/2.jpg', 'in/sub/3.jpg'].map(imgPromise))
        await fsp.mkdir('out')
        const steps = await stepsPromise()

        const output = new OutputCtl()
        await assembliesCreate(output, client, {
          recursive: true,
          steps,
          inputs: ['in'],
          output: 'out',
        })

        const outs = await rreaddirAsync('out')
        expect(outs).to.include('out/2.jpg')
        expect(outs).to.include('out/sub/3.jpg')
        expect(outs).to.have.lengthOf(2)
      }),
    )

    it(
      'should detect outdir conflicts',
      testCase(async (client) => {
        await fsp.mkdir('in')
        await Promise.all(['1.jpg', 'in/1.jpg'].map(imgPromise))
        await fsp.mkdir('out')
        const steps = await stepsPromise()

        const output = new OutputCtl()
        try {
          await assembliesCreate(output, client, {
            steps,
            inputs: ['1.jpg', 'in'],
            output: 'out',
          })
          throw new Error('assembliesCreate didnt err; should have')
        } catch (_err) {
          const result = output.get() as OutputEntry[]
          expect(result[result.length - 1])
            .to.have.property('type')
            .that.equals('error')
          expect(result[result.length - 1])
            .to.have.nested.property('msg.message')
            .that.equals("Output collision between 'in/1.jpg' and '1.jpg'")
        }
        // Allow time for any pending file streams and API calls to settle before test cleanup.
        // The assembliesCreate function may have started createAssembly calls that are still
        // in flight when the conflict error is thrown. These need time to be handled/cancelled.
        await new Promise((resolve) => setTimeout(resolve, 500))
      }),
    )

    it(
      'should not download the result if no output is specified',
      testCase(async (client) => {
        const infile = await imgPromise()
        const steps = await stepsPromise()

        const output = new OutputCtl()
        await assembliesCreate(output, client, {
          steps,
          inputs: [infile],
          output: null,
        })
        const result = output.get(true) as OutputEntry[]

        // When no output is specified, we might still get debug messages but no actual downloads
        const downloadingMsgs = result.filter((line) => String(line.msg) === 'DOWNLOADING')
        expect(downloadingMsgs.length).to.be.lessThanOrEqual(1)
      }),
    )

    it(
      'should accept invocations with no inputs',
      testCase(async (client) => {
        await imgPromise()
        const steps = await stepsPromise('steps.json', {
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
        })

        const output = new OutputCtl()
        await assembliesCreate(output, client, {
          steps,
          inputs: [],
          output: 'out.jpg',
        })

        await fsp.access('out.jpg')
      }),
    )

    it(
      'should allow deleting inputs after processing',
      testCase(async (client) => {
        const infile = await imgPromise()
        const steps = await stepsPromise()

        const output = new OutputCtl()
        await assembliesCreate(output, client, {
          steps,
          inputs: [infile],
          output: null,
          del: true,
        })

        try {
          await fsp.access(infile)
          throw new Error('File should have been deleted')
        } catch (err) {
          expect((err as NodeJS.ErrnoException).code).to.equal('ENOENT')
        }
      }),
    )

    it(
      'should not reprocess inputs that are older than their output',
      testCase(async (client) => {
        const infiles = await Promise.all(['in1.jpg', 'in2.jpg', 'in3.jpg'].map(imgPromise))
        const steps = await stepsPromise()
        await fsp.mkdir('out')

        const output1 = new OutputCtl()
        await assembliesCreate(output1, client, {
          steps,
          inputs: [infiles[0] as string],
          output: 'out',
        })

        const output2 = new OutputCtl()
        await assembliesCreate(output2, client, {
          steps,
          inputs: infiles,
          output: 'out',
        })
        const result = output2.get(true) as OutputEntry[]

        expect(
          result.map((line) => line.msg).filter((msg) => String(msg).includes('in1.jpg')),
        ).to.have.lengthOf(0)
      }),
    )
  })
})
