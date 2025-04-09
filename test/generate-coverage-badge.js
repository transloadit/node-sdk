#!/usr/bin/env node

import fs from 'fs/promises'
import { makeBadge } from 'badge-maker'

try {
  const json = JSON.parse(await fs.readFile(process.argv[2], 'utf-8'))

  // We only care about "statements"
  const coveragePercent = `${json.total.statements.pct}%`

  // https://github.com/badges/shields/tree/master/badge-maker#format
  const format = {
    label: 'coverage',
    message: coveragePercent,
    color: 'green',
  }

  const svg = makeBadge(format)

  await fs.writeFile('coverage-badge.svg', svg)
} catch (err) {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exit(1)
}
