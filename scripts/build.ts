#!/usr/bin/env tsx
/* eslint-disable no-console */

import { execSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'

console.log('Building Transloadit SDK...')

// Ensure dist directory exists
if (!existsSync('dist')) {
  mkdirSync('dist')
}

// Step 1: Compile TypeScript files without declarations
console.log('Compiling TypeScript...')
try {
  execSync('tsc --project tsconfig.json', { stdio: 'inherit' })
} catch {
  console.error('TypeScript compilation failed')
  process.exit(1)
}

// Step 2: Generate declaration files using our custom script
console.log('Generating declaration files...')
try {
  execSync('tsx scripts/generate-types.ts', { stdio: 'inherit' })
} catch {
  console.error('Declaration file generation failed')
  process.exit(1)
}

console.log('Build completed successfully!')
