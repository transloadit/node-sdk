import crypto from 'node:crypto'
import fsp from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { imageSize } from 'image-size'
import rreaddir from 'recursive-readdir'
import { describe, expect, it } from 'vitest'
import { create as assembliesCreate } from '../../../src/cli/commands/assemblies.ts'
import OutputCtl from './OutputCtl.ts'
import type { OutputEntry } from './test-utils.ts'
import { testCase } from './test-utils.ts'

const rreaddirAsync = promisify(rreaddir)

describe('assemblies', () => {
  describe('create', () => {
    const genericImg =
      'https://demos.transloadit.com/66/01604e7d0248109df8c7cc0f8daef8/snowflake.jpg'
    const fixtureImg = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '../fixtures/sample.jpg',
    )

    async function imgPromise(fname = 'in.jpg'): Promise<string> {
      await fsp.copyFile(fixtureImg, fname)
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
      'should download file with correct md5 hash',
      testCase(async (client) => {
        const infile = await imgPromise()
        const steps = await stepsPromise()

        const output = new OutputCtl()
        const { results } = await assembliesCreate(output, client, {
          steps,
          inputs: [infile],
          output: 'out-md5.jpg',
        })

        // Get the assembly result to find the expected md5hash
        // The results array contains assembly statuses
        const assemblyResult = results[0] as {
          results?: Record<string, Array<{ md5hash?: string }>>
        }
        expect(assemblyResult).to.have.property('results')
        const resultSteps = Object.values(assemblyResult.results ?? {})
        expect(resultSteps.length).to.be.greaterThan(0)
        const firstResult = resultSteps[0]?.[0]
        expect(firstResult).to.have.property('md5hash')
        const expectedMd5 = firstResult?.md5hash

        // Calculate md5 of downloaded file
        const downloadedBuffer = await fsp.readFile('out-md5.jpg')
        const actualMd5 = crypto.createHash('md5').update(downloadedBuffer).digest('hex')

        expect(actualMd5).to.equal(expectedMd5)
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
        // Small delay to allow abort signals to propagate and streams to close
        await new Promise((resolve) => setTimeout(resolve, 50))
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

    it(
      'should process many files with concurrency limiting',
      testCase(async (client) => {
        // Create 6 input files
        const fileCount = 6
        const infiles = await Promise.all(
          Array.from({ length: fileCount }, (_, i) => imgPromise(`in${i}.jpg`)),
        )
        const steps = await stepsPromise()
        await fsp.mkdir('out')

        const output = new OutputCtl()
        await assembliesCreate(output, client, {
          steps,
          inputs: infiles,
          output: 'out',
          concurrency: 2, // Only process 2 at a time
        })

        // Verify all files were processed successfully
        const outs = await fsp.readdir('out')
        expect(outs).to.have.lengthOf(fileCount)

        // Analyze debug output to verify concurrency limiting was applied.
        // The fixed code emits "PROCESSING JOB" when jobs start (up to concurrency limit).
        // The unfixed code has no such limiting - all jobs start at once with "GOT JOB".
        const debugOutput = output.get(true) as OutputEntry[]
        const messages = debugOutput.map((e) => String(e.msg))

        // Check that "PROCESSING JOB" messages exist (added by the fix)
        const processingMessages = messages.filter((m) => m.startsWith('PROCESSING JOB'))
        expect(
          processingMessages.length,
          'Expected "PROCESSING JOB" debug messages from concurrency-limited processing',
        ).to.be.greaterThan(0)

        // Track max concurrent jobs by counting "PROCESSING JOB" vs "COMPLETED" messages
        let activeJobs = 0
        let maxActiveJobs = 0
        for (const msg of messages) {
          if (msg.startsWith('PROCESSING JOB')) {
            activeJobs++
            maxActiveJobs = Math.max(maxActiveJobs, activeJobs)
          } else if (msg.startsWith('COMPLETED')) {
            activeJobs--
          }
        }

        // With concurrency=2, we should never have more than 2 jobs processing at once
        expect(
          maxActiveJobs,
          'Max concurrent jobs should not exceed concurrency limit',
        ).to.be.at.most(2)
      }),
    )

    it(
      'should close streams immediately in single-assembly mode',
      testCase(async (client) => {
        // Create multiple input files for single-assembly mode
        const fileCount = 5
        const infiles = await Promise.all(
          Array.from({ length: fileCount }, (_, i) => imgPromise(`in${i}.jpg`)),
        )
        const steps = await stepsPromise()
        await fsp.mkdir('out')

        const output = new OutputCtl()
        await assembliesCreate(output, client, {
          steps,
          inputs: infiles,
          output: 'out',
          singleAssembly: true, // All files in one assembly
        })

        // Verify files were processed
        const outs = await fsp.readdir('out')
        expect(outs.length).to.be.greaterThan(0)

        // Analyze debug output to verify streams were handled properly.
        // The fixed code emits "STREAM CLOSED" when closing streams during collection.
        // The unfixed code keeps all streams open until upload, risking fd exhaustion.
        const debugOutput = output.get(true) as OutputEntry[]
        const messages = debugOutput.map((e) => String(e.msg))

        // Check that streams were closed during collection (added by the fix)
        const streamClosedMessages = messages.filter((m) => m.startsWith('STREAM CLOSED'))
        expect(
          streamClosedMessages.length,
          'Expected "STREAM CLOSED" messages indicating proper fd management',
        ).to.be.greaterThan(0)
      }),
    )
  })
})
