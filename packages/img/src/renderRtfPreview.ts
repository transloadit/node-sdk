const permittedTags = new Set([
  'DIV',
  'P',
  'SPAN',
  'BR',
  'B',
  'STRONG',
  'I',
  'EM',
  'U',
  'S',
  'SUB',
  'SUP',
])
const permittedStyles = [
  'font-size',
  'font-weight',
  'font-style',
  'text-decoration',
  'text-align',
  'color',
  'background-color',
  'margin-left',
  'margin-right',
  'text-indent',
]

/** Convert rich text to inert, formatting-only HTML: no images, imports, navigation or active content. */
export async function renderRtfPreview(bytes: ArrayBuffer): Promise<string> {
  const { RTFJS } = await import('rtf.js')
  RTFJS.loggingEnabled(false)
  // Omit onImport: rtf.js ignores imports, while rejecting its callback fails the whole document.
  const rtf = new RTFJS.Document(bytes, {
    onHyperlink() {
      const element = document.createElement('span')
      return { element, content: element }
    },
    onPicture() {
      return document.createElement('span')
    },
  })
  const inert = document.implementation.createHTMLDocument()
  function copy(node: Node): Node {
    if (node.nodeType === Node.TEXT_NODE) return inert.createTextNode(node.textContent ?? '')
    if (!(node instanceof HTMLElement)) return inert.createTextNode('')
    const element = inert.createElement(
      permittedTags.has(node.tagName) ? node.tagName.toLowerCase() : 'span',
    )
    for (const property of permittedStyles) {
      const value = node.style.getPropertyValue(property)
      if (value) element.style.setProperty(property, value)
    }
    for (const child of node.childNodes) element.append(copy(child))
    return element
  }
  for (const node of await rtf.render()) inert.body.append(copy(node))
  return (
    "<!doctype html><html><head><meta charset=\"utf-8\"><meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'\"><style>:root{color-scheme:light}body{background:Canvas;color:CanvasText;font:16px/1.6 system-ui,sans-serif;margin:24px;overflow-wrap:anywhere}</style></head><body>" +
    inert.body.innerHTML +
    '</body></html>'
  )
}
