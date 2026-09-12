import type { ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps): ReactNode {
  return (
    <html lang="en">
      <head>
        <style>{'picture > img.hero {display:block;height:auto;max-width:960px;width:100%}'}</style>
      </head>
      <body>{children}</body>
    </html>
  )
}
