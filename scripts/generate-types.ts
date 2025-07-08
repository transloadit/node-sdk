#!/usr/bin/env tsx
/* eslint-disable no-console */

import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

// This script generates TypeScript declaration files while working around TS7056 errors

const ROBOT_INDEX_PATH = join('src', 'alphalib', 'types', 'robots', '_index.ts')
const TEMPLATE_PATH = join('src', 'alphalib', 'types', 'template.ts')

// Step 1: Create backup of original files
const robotIndexOriginal = readFileSync(ROBOT_INDEX_PATH, 'utf-8')
const templateOriginal = readFileSync(TEMPLATE_PATH, 'utf-8')

// Step 2: Apply temporary patches to avoid TS7056
const robotIndexPatched = robotIndexOriginal
  .replace(
    'export const robotsSchema = z.discriminatedUnion',
    'export const robotsSchema: z.ZodDiscriminatedUnion<"robot", z.ZodDiscriminatedUnionOption<"robot">[]> = z.discriminatedUnion'
  )
  .replace(
    'export const robotsWithHiddenFieldsSchema = z.discriminatedUnion',
    'export const robotsWithHiddenFieldsSchema: z.ZodDiscriminatedUnion<"robot", z.ZodDiscriminatedUnionOption<"robot">[]> = z.discriminatedUnion'
  )
  .replace(
    'export const robotsWithHiddenBotsSchema = z.discriminatedUnion',
    'export const robotsWithHiddenBotsSchema: z.ZodDiscriminatedUnion<"robot", z.ZodDiscriminatedUnionOption<"robot">[]> = z.discriminatedUnion'
  )
  .replace(
    'export const robotsWithHiddenBotsAndFieldsSchema = z.discriminatedUnion',
    'export const robotsWithHiddenBotsAndFieldsSchema: z.ZodDiscriminatedUnion<"robot", z.ZodDiscriminatedUnionOption<"robot">[]> = z.discriminatedUnion'
  )

const templatePatched = templateOriginal
  .replace('export const stepSchema = z', 'export const stepSchema: z.ZodType = z')
  .replace('export const stepsSchema = z.record', 'export const stepsSchema: z.ZodType = z.record')
  .replace(
    'const optionalStepsSchema = stepsSchema.optional()',
    'const optionalStepsSchema: z.ZodType = stepsSchema.optional()'
  )

// Step 3: Write patched files
writeFileSync(ROBOT_INDEX_PATH, robotIndexPatched)
writeFileSync(TEMPLATE_PATH, templatePatched)

try {
  // Step 4: Generate declarations
  console.log('Generating TypeScript declarations...')
  execSync('tsc --project tsconfig.json --declaration --emitDeclarationOnly', {
    stdio: 'inherit',
  })
  console.log('Declaration generation successful!')
} catch (error) {
  console.error('Declaration generation failed')
  throw error
} finally {
  // Step 5: Restore original files
  writeFileSync(ROBOT_INDEX_PATH, robotIndexOriginal)
  writeFileSync(TEMPLATE_PATH, templateOriginal)
  console.log('Original files restored')
}
