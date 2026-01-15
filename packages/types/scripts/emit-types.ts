import { fileURLToPath } from 'node:url'

const steps = [
  'emit-types pipeline (outline):',
  '1) import schemas from @transloadit/zod/v3',
  '2) generate a temp .ts file exporting z.infer<typeof schema> aliases',
  '3) run tsc --emitDeclarationOnly against that temp file',
  '4) write .d.ts output into packages/types/src/generated',
  '5) keep generated .d.ts free of zod imports (structural types only)',
  '6) leave CI type-equality tests in @transloadit/zod to ensure parity',
]

if (process.argv[1] && fileURLToPath(import.meta.url) === fileURLToPath(process.argv[1])) {
  console.log(steps.join('\n'))
}
