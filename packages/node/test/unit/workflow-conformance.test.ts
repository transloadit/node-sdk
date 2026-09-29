import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { expect, it } from 'vitest'

import { ContractClient } from '../../src/generated-contract/client.ts'
import { Transloadit } from '../../src/Transloadit.ts'
import { workflowServer, workflowVectors } from '../workflowFixture.ts'

it.each(workflowVectors.smartCdn)('shared Smart CDN vector: $id', (scenario) => {
  const client = new Transloadit({
    authKey: workflowVectors.credentials.key,
    authSecret: workflowVectors.credentials.secret,
  })
  const original = structuredClone(scenario.params)
  expect(
    client.getSignedSmartCDNUrl({
      ...scenario,
      urlParams: scenario.params,
    }),
  ).toBe(scenario.expectedUrl)
  expect(scenario.params).toEqual(original)
})

it.each(workflowVectors.cases)('shared public SDK workflow: $id', async (scenario) => {
  const server = await workflowServer(scenario)
  const directory = await mkdtemp(path.join(tmpdir(), 'node-sdk-workflow-'))
  const client = new Transloadit({
    authKey: workflowVectors.credentials.key,
    authSecret: workflowVectors.credentials.secret,
    endpoint: server.origin,
  })
  const contract = new ContractClient({
    origin: server.origin,
    authentication: { kind: 'signed', ...workflowVectors.credentials },
  })
  try {
    switch (scenario.kind) {
      case 'wait': {
        const result = await contract.waitForAssembly({
          assemblyId: workflowVectors.assemblyId,
          interval: 1,
          timeout: 5000,
        })
        expect(result).toMatchObject(scenario.expected)
        expect(server.requests).toHaveLength(scenario.responses.length)
        break
      }
      case 'abort': {
        const controller = new AbortController()
        const reason = new Error('owned workflow interruption')
        controller.abort(reason)
        await expect(
          contract.waitForAssembly({
            assemblyId: workflowVectors.assemblyId,
            signal: controller.signal,
          }),
        ).rejects.toBe(reason)
        expect(server.requests).toEqual([])
        break
      }
      case 'deadline':
        await expect(
          contract.waitForAssembly({
            assemblyId: workflowVectors.assemblyId,
            timeout: 500,
            interval: 1,
          }),
        ).rejects.toMatchObject({ code: 'ASSEMBLY_WORKFLOW_TIMED_OUT' })
        expect(server.requests.length).toBeGreaterThan(0)
        break
      case 'cancel': {
        expect(
          await contract.cancelAndWaitForAssembly({
            assemblyId: workflowVectors.assemblyId,
            interval: 1,
          }),
        ).toMatchObject(scenario.expected)
        expect(server.requests.filter((request) => request.startsWith('DELETE '))).toHaveLength(1)
        break
      }
      case 'upload':
      case 'resume': {
        const file = path.join(directory, scenario.filename)
        const bytes = Buffer.from(scenario.hex, 'hex')
        await writeFile(file, bytes)
        const controller = new AbortController()
        if (scenario.kind === 'resume') server.interruptNextChunk(() => controller.abort())
        const upload = client.createAssembly({
          assemblyId: workflowVectors.assemblyId,
          files: { file },
          chunkSize: scenario.chunkSize,
          signal: controller.signal,
          waitForCompletion: true,
        })
        if (scenario.kind === 'resume') {
          await expect(upload).rejects.toThrow()
          assert.equal(server.received().length, scenario.interruptAfterBytes)
          // A fresh public client receives only the Assembly URL and local file, not a cached offset.
          const resumed = new Transloadit({
            authKey: workflowVectors.credentials.key,
            authSecret: workflowVectors.credentials.secret,
            endpoint: server.origin,
          })
          expect(
            await resumed.resumeAssemblyUploads({
              assemblyUrl: `${server.origin}/assemblies/${workflowVectors.assemblyId}`,
              files: { file },
              chunkSize: scenario.chunkSize,
              waitForCompletion: true,
            }),
          ).toMatchObject({ ok: 'ASSEMBLY_COMPLETED' })
          expect(server.requests).toContain('HEAD /uploads/one')
          expect(server.patchOffsets[1]).toBe(scenario.interruptAfterBytes)
          const patchCount = server.patchOffsets.length
          await resumed.resumeAssemblyUploads({
            assemblyUrl: `${server.origin}/assemblies/${workflowVectors.assemblyId}`,
            files: { file },
          })
          expect(server.patchOffsets).toHaveLength(patchCount)
        } else {
          expect(await upload).toMatchObject({ ok: 'ASSEMBLY_COMPLETED' })
        }
        expect(server.received()).toEqual(bytes)
        expect(server.requests.filter((request) => request === 'POST /uploads/')).toHaveLength(1)
        break
      }
      default: {
        const unhandled: never = scenario
        throw new Error(`Unclassified workflow scenario: ${JSON.stringify(unhandled)}`)
      }
    }
    server.verify()
  } finally {
    try {
      await server.close()
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  }
})
