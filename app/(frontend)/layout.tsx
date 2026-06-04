import React from 'react'
import Link from 'next/link'
import './styles.css'

export const metadata = {
  description: 'A blank template using Payload in a Next.js app.',
  title: 'Payload Blank Template',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="en">
      <body className="bg-paper text-light font-body text-lg leading-8 min-h-screen m-0">
        <nav className="sticky top-0 z-100 bg-black/95 backdrop-blur-xl border-b border-rule">
          <div className="max-w-5xl mx-auto px-8 py-3 flex items-center justify-between">
            <Link href="/" className="font-mono text-sm font-bold text-light tracking-tight no-underline">
              payload<span className="text-accent">.</span>
            </Link>
            <div className="flex items-center gap-5">
              <span className="flex items-center gap-1.5 font-mono text-[0.55rem] font-medium uppercase tracking-[0.18em] text-muted">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_6px_rgba(46,204,64,0.4)]" />
                live
              </span>
              <Link href="/admin" className="font-mono text-[0.6rem] font-medium uppercase tracking-[0.12em] text-dim no-underline hover:text-white transition-colors">Admin</Link>
              <Link href="https://payloadcms.com/docs" target="_blank" rel="noopener noreferrer" className="font-mono text-[0.6rem] font-medium uppercase tracking-[0.12em] text-dim no-underline hover:text-white transition-colors">Docs</Link>
            </div>
          </div>
        </nav>
        <main>{children}</main>
        <footer className="border-t border-rule px-8 py-5 mt-24">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <span className="font-mono font-bold text-sm text-light">payload<span className="text-accent">.</span></span>
            <span className="font-mono text-[0.6rem] text-muted tracking-wide">&copy; {new Date().getFullYear()}</span>
            <Link href="/admin" className="font-mono text-[0.6rem] font-medium uppercase tracking-[0.12em] text-dim no-underline hover:text-white transition-colors">Admin &rarr;</Link>
          </div>
        </footer>
      </body>
    </html>
  )
}
