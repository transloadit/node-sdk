import { fixtureImage } from '../../storage-fixtures.ts'
import { DynamicImage } from './DynamicImage.tsx'

export default function Page() {
  // Synthetic query result: only canonical receipt data crosses into the client component.
  const receipt = {
    ...fixtureImage('documents/avatar.jpg', 400, 300),
    size: 1000,
    mime: 'image/jpeg',
  }
  return <DynamicImage receipt={receipt} />
}
