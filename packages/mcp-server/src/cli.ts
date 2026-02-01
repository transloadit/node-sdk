import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createTransloaditMcpHttpHandler, createTransloaditMcpServer } from './index.ts'

const printHelp = (): void => {
  console.log(`transloadit-mcp

Usage:
  transloadit-mcp stdio
  transloadit-mcp http [--host 127.0.0.1] [--port 5723] [--config path]

Environment:
  TRANSLOADIT_KEY
  TRANSLOADIT_SECRET
  TRANSLOADIT_MCP_TOKEN
`)
}

type CliConfig = {
  host?: string
  port?: number
  configPath?: string
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
    const mcpToken = (fileConfig.mcpToken ?? process.env.TRANSLOADIT_MCP_TOKEN) as
      | string
      | undefined

    if (!isLocalHost(host) && !mcpToken) {
      throw new Error('TRANSLOADIT_MCP_TOKEN is required when binding to non-localhost host.')
    }

    const handler = await createTransloaditMcpHttpHandler({
      authKey: (fileConfig.authKey ?? process.env.TRANSLOADIT_KEY) as string | undefined,
      authSecret: (fileConfig.authSecret ?? process.env.TRANSLOADIT_SECRET) as string | undefined,
      mcpToken,
      allowedOrigins: fileConfig.allowedOrigins as string[] | undefined,
      allowedHosts: fileConfig.allowedHosts as string[] | undefined,
      enableDnsRebindingProtection: fileConfig.enableDnsRebindingProtection as boolean | undefined,
      path,
    })

    const server = createServer(handler)

    await new Promise<void>((resolve) => {
      server.listen(port, host, resolve)
    })

    console.log(`Transloadit MCP server listening on http://${host}:${port}${path}`)

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
  })
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
