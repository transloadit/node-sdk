import fs from 'node:fs'
import { Command, Option } from 'clipanion'
import type { AssemblyStatus } from '../../alphalib/types/assemblyStatus.ts'
import { sendTusRequest } from '../../tus.ts'
import type { IOutputCtl } from '../OutputCtl.ts'
import { UnauthenticatedCommand } from './BaseCommand.ts'

export interface UploadOptions {
  file: string
  tusEndpoint: string
  assemblyUrl: string
  field?: string
}

export async function upload(
  output: IOutputCtl,
  { file, tusEndpoint, assemblyUrl, field = ':original' }: UploadOptions,
): Promise<void> {
  const stream = fs.createReadStream(file)
  const streamsMap = {
    [field]: { path: file, stream },
  }

  const assembly: AssemblyStatus = {
    tus_url: tusEndpoint,
    assembly_ssl_url: assemblyUrl,
  } as AssemblyStatus

  const { uploadUrls } = await sendTusRequest({
    streamsMap,
    assembly,
    requestedChunkSize: Number.POSITIVE_INFINITY,
    uploadConcurrency: 1,
    onProgress: () => {},
  })

  const uploadUrl = uploadUrls[field]

  output.print(`Uploaded ${file}`, {
    status: 'ok',
    file,
    field,
    assembly_url: assemblyUrl,
    tus_endpoint: tusEndpoint,
    upload_url: uploadUrl,
  })
}

export class UploadCommand extends UnauthenticatedCommand {
  static override paths = [['upload']]

  static override usage = Command.Usage({
    category: 'Uploads',
    description: 'Upload a local file to a tus endpoint for an Assembly',
    details: `
      Upload a local file to a tus endpoint and attach it to an existing Assembly.
    `,
    examples: [
      [
        'Upload a file to an Assembly',
        'transloadit upload ./video.mp4 https://api2.transloadit.com/resumable --assembly https://api2.transloadit.com/assemblies/ASSEMBLY_ID',
      ],
    ],
  })

  file = Option.String({ required: true })
  tusEndpoint = Option.String({ required: true })

  assemblyUrl = Option.String('--assembly', {
    description: 'Assembly URL to attach this upload to',
    required: true,
  })

  field = Option.String('--field', {
    description: 'Field name for the upload (default: :original)',
  })

  protected async run(): Promise<number | undefined> {
    try {
      await upload(this.output, {
        file: this.file,
        tusEndpoint: this.tusEndpoint,
        assemblyUrl: this.assemblyUrl,
        field: this.field,
      })
      return undefined
    } catch (err) {
      this.output.error(err instanceof Error ? err.message : String(err))
      return 1
    }
  }
}
