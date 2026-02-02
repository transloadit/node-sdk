import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createTransloaditMcpHttpHandler, createTransloaditMcpServer } from './index.ts'
import { buildRedactor, getLogger } from './logger.ts'

const printHelp = (): void => {
  process.stdout.write(`transloadit-mcp

Usage:
  transloadit-mcp stdio
  transloadit-mcp http [--host 127.0.0.1] [--port 5723] [--endpoint URL] [--config path]

Environment:
  TRANSLOADIT_KEY
  TRANSLOADIT_SECRET
  TRANSLOADIT_MCP_TOKEN
  TRANSLOADIT_ENDPOINT
`)
}

type CliConfig = {
  host?: string
  port?: number
  configPath?: string
  endpoint?: string
}

const parseArgs = (args: string[]): { command: string; config: CliConfig } => {
  const command = args[0] ?? 'stdio'
  const config: CliConfig = {}

  for (let i = 1; i < args.length; i += 1) {
    const arg = args[i]
    if (arg === '--host') {
      config.host = args[i + 1]
      i += 1
      continue
    }
    if (arg.startsWith('--host=')) {
      config.host = arg.slice('--host='.length)
      continue
    }
    if (arg === '--port') {
      const value = Number(args[i + 1])
      config.port = Number.isFinite(value) ? value : undefined
      i += 1
      continue
    }
    if (arg.startsWith('--port=')) {
      const value = Number(arg.slice('--port='.length))
      config.port = Number.isFinite(value) ? value : undefined
      continue
    }
    if (arg === '--config') {
      config.configPath = args[i + 1]
      i += 1
      continue
    }
    if (arg.startsWith('--config=')) {
      config.configPath = arg.slice('--config='.length)
      continue
    }
    if (arg === '--endpoint') {
      config.endpoint = args[i + 1]
      i += 1
      continue
    }
    if (arg.startsWith('--endpoint=')) {
      config.endpoint = arg.slice('--endpoint='.length)
    }
  }

  return { command, config }
}

const isLocalHost = (host: string | undefined): boolean =>
  host === '127.0.0.1' || host === 'localhost' || host === '::1'

const loadConfig = async (configPath?: string): Promise<Record<string, unknown>> => {
  if (!configPath) {
    return {}
  }
  const contents = await readFile(configPath, 'utf8')
  return JSON.parse(contents) as Record<string, unknown>
}

const main = async (): Promise<void> => {
  const logger = getLogger().nest('cli')
  const args = process.argv.slice(2)
  const { command, config } = parseArgs(args)

  if (command === '--help' || command === '-h') {
    printHelp()
    return
  }

  if (command && command !== 'stdio' && command !== 'http') {
    throw new Error(`Unknown command: ${command}`)
  }

  if (command === 'http') {
    const fileConfig = await loadConfig(config.configPath)
    const host = (config.host ?? fileConfig.host ?? '127.0.0.1') as string
    const port = Number(config.port ?? fileConfig.port ?? 5723)
    const path = (fileConfig.path as string | undefined) ?? '/mcp'
    const endpoint = (config.endpoint ?? fileConfig.endpoint ?? process.env.TRANSLOADIT_ENDPOINT) as
      | string
      | undefined
    const mcpToken = (fileConfig.mcpToken ?? process.env.TRANSLOADIT_MCP_TOKEN) as
      | string
      | undefined

    if (!isLocalHost(host) && !mcpToken) {
      throw new Error('TRANSLOADIT_MCP_TOKEN is required when binding to non-localhost host.')
    }

    const handler = await createTransloaditMcpHttpHandler({
      authKey: (fileConfig.authKey ?? process.env.TRANSLOADIT_KEY) as string | undefined,
      authSecret: (fileConfig.authSecret ?? process.env.TRANSLOADIT_SECRET) as string | undefined,
      endpoint,
      mcpToken,
      allowedOrigins: fileConfig.allowedOrigins as string[] | undefined,
      allowedHosts: fileConfig.allowedHosts as string[] | undefined,
      enableDnsRebindingProtection: fileConfig.enableDnsRebindingProtection as boolean | undefined,
      path,
      logger,
    })

    const server = createServer(handler)

    await new Promise<void>((resolve) => {
      server.listen(port, host, resolve)
    })

    logger.notice(`Transloadit MCP server listening on http://${host}:${port}${path}`)

    const shutdown = async () => {
      await handler.close()
      server.close()
    }

    process.once('SIGINT', shutdown)
    process.once('SIGTERM', shutdown)
    return
  }

  const server = createTransloaditMcpServer({
    authKey: process.env.TRANSLOADIT_KEY,
    authSecret: process.env.TRANSLOADIT_SECRET,
    endpoint: process.env.TRANSLOADIT_ENDPOINT,
  })
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch((err) => {
  const logger = getLogger().nest('cli')
  const redact = buildRedactor([
    process.env.TRANSLOADIT_KEY,
    process.env.TRANSLOADIT_SECRET,
    process.env.TRANSLOADIT_MCP_TOKEN,
  ])
  logger.err('MCP server failed: %s', redact(err))
  process.exit(1)
})
