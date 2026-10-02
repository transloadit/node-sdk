import { z } from 'zod'

/** One out-of-band tus upload the caller runs where the file lives, such as an agent sandbox. */
export const uploadInstructionSchema = z.object({
  fieldname: z.string(),
  tus_endpoint: z.string(),
  metadata: z.object({ assembly_url: z.string(), fieldname: z.string() }),
  curl: z.string(),
})

export type UploadInstruction = z.infer<typeof uploadInstructionSchema>

const shellQuote = (value: string): string => `'${value.replaceAll("'", `'\\''`)}'`

const toBase64 = (value: string): string => Buffer.from(value, 'utf8').toString('base64')

/**
 * Builds a single `curl` command per expected upload, using tus creation-with-upload (one POST
 * with the file as body), which Transloadit's tusd advertises; it prints `201` on success. The
 * shell derives `Upload-Length` and the base64 filename from the file, so any local name works.
 *
 * The Assembly URL in the metadata is the only capability these commands carry: whoever holds it
 * can add files to this Assembly while it waits for uploads. Credentials (Auth Keys, secrets,
 * bearer tokens) must never be added here, because the commands are shown to the model and run
 * in its sandbox.
 */
export const buildUploadInstructions = (
  assembly: { tus_url?: unknown; assembly_ssl_url?: unknown },
  count: number,
): UploadInstruction[] | undefined => {
  const tusEndpoint = assembly.tus_url
  const assemblyUrl = assembly.assembly_ssl_url
  if (typeof tusEndpoint !== 'string' || typeof assemblyUrl !== 'string') return undefined

  return Array.from({ length: count }, (_, index) => {
    const fieldname = `file_${index + 1}`
    const metadata = `assembly_url ${toBase64(assemblyUrl)},fieldname ${toBase64(fieldname)}`
    const curl = [
      `FILE='/path/to/the/file'`,
      `curl -sS -o /dev/null -w '%{http_code}\\n' -X POST ${shellQuote(tusEndpoint)} \\`,
      `  -H 'Tus-Resumable: 1.0.0' \\`,
      `  -H "Upload-Length: $(wc -c < "$FILE" | tr -d ' ')" \\`,
      `  -H "Upload-Metadata: ${metadata},filename $(basename "$FILE" | tr -d '\\n' | base64 | tr -d '\\n')" \\`,
      `  -H 'Content-Type: application/offset+octet-stream' \\`,
      `  --data-binary @"$FILE"`,
    ].join('\n')
    return {
      fieldname,
      tus_endpoint: tusEndpoint,
      metadata: { assembly_url: assemblyUrl, fieldname },
      curl,
    }
  })
}
