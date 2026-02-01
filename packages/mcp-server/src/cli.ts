import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createTransloaditMcpServer } from './index.ts'

const printHelp = (): void => {
  console.log(`transloadit-mcp

Usage:
  transloadit-mcp stdio

Environment:
  TRANSLOADIT_KEY
  TRANSLOADIT_SECRET
`)
}

const main = async (): Promise<void> => {
  const [command] = process.argv.slice(2)

  if (command === '--help' || command === '-h') {
    printHelp()
    return
  }

  if (command && command !== 'stdio') {
    throw new Error(`Unknown command: ${command}`)
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
