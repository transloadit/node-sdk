import type { ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps): ReactNode {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
