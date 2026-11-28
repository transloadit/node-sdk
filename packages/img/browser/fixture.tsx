import { useDocumentPreview, Viewer } from '@transloadit/viewer/react/viewer'
import { createRoot } from 'react-dom/client'
import '@transloadit/viewer/viewer.css'

declare const fileOrigin: string

const source = {
  asset_id: 'notes',
  version_id: '1',
  mediaUrl: `${fileOrigin}/notes`,
  expiresAt: Date.now() + 60_000,
}

function Fixture() {
  const preview = useDocumentPreview({ source, format: 'markdown' })
  return (
    <>
      <Viewer kind="pdf" mode="pdfjs" src={`${fileOrigin}/report`} title="Lecture slides" />
      <button type="button" onClick={preview.open}>
        Open notes
      </button>
      {preview.bytes && (
        <Viewer
          kind="document"
          title="Notes"
          format="markdown"
          bytes={preview.bytes}
          mime={preview.mime}
          truncated={preview.truncated}
        />
      )}
    </>
  )
}

const root = document.getElementById('root')
if (!root) throw new Error('Missing fixture root')
createRoot(root).render(<Fixture />)
