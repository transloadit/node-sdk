import type { AssemblyUploadSession } from '../../src/contractTus.ts'

import assert from 'node:assert/strict'

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
        const bytes = Buffer.from(scenario.hex, 'hex')
        const file = { data: new Blob([bytes]), filename: scenario.filename }
        let session: AssemblyUploadSession | undefined
        const controller = new AbortController()
        if (scenario.kind === 'resume') server.interruptNextChunk(() => controller.abort())
        const upload = contract.uploadAssemblyFile({
          assemblyId: workflowVectors.assemblyId,
          file,
          chunkSize: scenario.chunkSize,
          signal: controller.signal,
          retryDelay: 1,
          onSession: (created) => {
            session = created
          },
        })
        if (scenario.kind === 'resume') {
          await expect(upload).rejects.toThrow()
          assert.equal(server.received().length, scenario.interruptAfterBytes)
          // A fresh public client receives only the Assembly URL and local file, not a cached offset.
          assert(session)
          const persisted: AssemblyUploadSession = JSON.parse(JSON.stringify(session))
          const resumed = new ContractClient({
            origin: server.origin,
            authentication: { kind: 'signed', ...workflowVectors.credentials },
          })
          expect(
            await resumed.resumeAssemblyFile({
              assemblyId: workflowVectors.assemblyId,
              session: persisted,
              file,
              chunkSize: scenario.chunkSize,
            }),
          ).toMatchObject({ size: bytes.length })
          expect(server.requests).toContain('HEAD /resumable/files/one')
          expect(server.patchOffsets[1]).toBe(scenario.interruptAfterBytes)
          const patchCount = server.patchOffsets.length
          await resumed.resumeAssemblyFile({
            assemblyId: workflowVectors.assemblyId,
            session: persisted,
            file,
          })
          expect(server.patchOffsets).toHaveLength(patchCount)
        } else {
          expect(await upload).toMatchObject({ size: bytes.length })
        }
        expect(
          await contract.waitForAssembly({ assemblyId: workflowVectors.assemblyId, interval: 1 }),
        ).toMatchObject({ ok: 'ASSEMBLY_COMPLETED' })
        expect(server.received()).toEqual(bytes)
        expect(
          server.requests.filter((request) => request === 'POST /resumable/files'),
        ).toHaveLength(1)
        if (scenario.loseResponseAfterBytes !== undefined)
          expect(server.patchOffsets[1]).toBe(scenario.loseResponseAfterBytes)
        break
      }
      default: {
        const unhandled: never = scenario
        throw new Error(`Unclassified workflow scenario: ${JSON.stringify(unhandled)}`)
      }
    }
    server.verify()
  } finally {
    await server.close()
  }
})
