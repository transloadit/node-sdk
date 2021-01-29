import { expectType } from 'tsd'

import * as intoStream from 'into-stream'
import { Readable } from 'stream'

import { Transloadit, Assembly, ListedAssembly, ReplayedAssembly, AssemblyNotification, TemplateResponse, ListedTemplate, KeyVal } from '../'

const transloadit = new Transloadit({ authKey: '123', authSecret: '456', endpoint: 'http://localhost', maxRetries: 1 })

expectType<string>(transloadit.getLastUsedAssemblyUrl())
expectType<void>(transloadit.setDefaultTimeout(1))

expectType<Promise<Assembly>>(transloadit.createAssembly({
  params: {
    steps: { foo: 'bar' },
    template_id: 'template',
    notify_url: 'url',
    fields: { a: 'b', c: 1 },
    allow_steps_override: false,
  },
  files: {
    file1: '/path/to/file',
  },
  uploads: {
    file2: 'string',
    file3: intoStream('string'),
    file4: Buffer.from('string'),
  },
  isResumable: true,
  timeout: 1,
  waitForCompletion: true,
  onAssemblyProgress: (assembly) => {
    expectType<Assembly>(assembly)
  },
  onUploadProgress: ({ uploadedBytes, totalBytes }) => {
    expectType<number | undefined>(uploadedBytes)
    expectType<number | undefined>(totalBytes)
  },
}))

expectType<Promise<Assembly>>(transloadit.awaitAssemblyCompletion('1', {
  onAssemblyProgress: (assembly) => {
    expectType<Assembly>(assembly)
  },
  timeout: 1,
  interval: 1,
}))

expectType<Promise<Assembly>>(transloadit.cancelAssembly('1'))
expectType<Promise<ReplayedAssembly>>(transloadit.replayAssembly('1', { param1: { a: 1 }}))
expectType<Promise<{ ok: string, success: boolean }>>(transloadit.replayAssemblyNotification('1', { param1: { a: 1 }}))
expectType<Promise<{ count: number, items: AssemblyNotification[] }>>(transloadit.listAssemblyNotifications({ param1: { a: 1 }}))
expectType<Readable>(transloadit.streamAssemblyNotifications({ param1: { a: 1 }}))
expectType<Promise<{ count: number, items: ListedAssembly[] }>>(transloadit.listAssemblies({ param1: { a: 1 }}))
expectType<Readable>(transloadit.streamAssemblies({ param1: { a: 1 }}))
expectType<Promise<Assembly>>(transloadit.getAssembly('1'))

expectType<Promise<TemplateResponse>>(transloadit.createTemplate({ param1: { a: 1 }}))
expectType<Promise<TemplateResponse>>(transloadit.editTemplate('1', { param1: { a: 1 }}))
expectType<Promise<{ ok: string, message: string }>>(transloadit.deleteTemplate('1'))
expectType<Promise<TemplateResponse>>(transloadit.getTemplate('1'))
expectType<Promise<{ count: number, items: ListedTemplate[] }>>(transloadit.listTemplates({ param1: { a: 1 }}))
expectType<Readable>(transloadit.streamTemplates({ param1: { a: 1 }}))

expectType<Promise<KeyVal>>(transloadit.getBill('2020-01'))

expectType<{ signature: string, params: string }>(transloadit.calcSignature({ param1: { a: 1 }}))
