import { headers as getHeaders } from 'next/headers.js'
import Image from 'next/image'
import { getPayload } from 'payload'
import { fileURLToPath } from 'url'

import config from '@/payload.config'
import './styles.css'

export default async function HomePage() {
  const headers = await getHeaders()
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })
  const { user } = await payload.auth({ headers })

  const pages = await payload.find({
    collection: 'pages',
    limit: 100,
  })

  const fileURL = `vscode://file/${fileURLToPath(import.meta.url)}`

  return (
    <div className="flex flex-col justify-between items-center min-h-screen p-12 max-w-5xl mx-auto max-[400px]:p-6">
      <div className="flex flex-col items-center justify-center flex-grow w-full">
        <div className="mb-8 opacity-70 animate-fade-up">
          <Image
            alt="Payload Logo"
            height={48}
            src="https://raw.githubusercontent.com/payloadcms/payload/3.x/packages/ui/src/assets/payload-favicon.svg"
            width={48}
          />
        </div>
        <h1 className="text-center font-mono text-[clamp(1.6rem,4vw,2.4rem)] leading-tight tracking-tight m-0 animate-fade-up [animation-delay:0.12s] opacity-0">
          {user ? `Welcome back, ${user.email}` : 'Welcome to your new project.'}
        </h1>
        <div className="flex items-center gap-2.5 mt-2 animate-fade-up [animation-delay:0.24s] opacity-0">
          <a
            className="no-underline font-mono text-[0.65rem] font-semibold uppercase tracking-[0.14em] px-4 py-2 text-ink bg-light border border-ink hover:bg-accent hover:border-accent hover:text-light hover:-translate-y-px transition-all duration-200"
            href={payloadConfig.routes.admin}
            rel="noopener noreferrer"
            target="_blank"
          >
            Admin
          </a>
        </div>

        {pages.docs.length > 0 && (
          <div className="w-full max-w-[420px] mt-12 animate-fade-up [animation-delay:0.36s] opacity-0">
            <span className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-accent pb-3 border-b border-rule block">
              Pages
            </span>
            <ul className="list-none p-0 m-0">
              {pages.docs.map((page: any, i: number) => (
                <li key={page.id}>
                  <a
                    href={`/${page.slug}`}
                    className="grid grid-cols-[1fr_auto_auto] items-center gap-4 py-3 border-b border-rule no-underline hover:pl-2 transition-all duration-200 group"
                  >
                    <span className="font-mono text-[0.85rem] font-medium text-light">{page.title}</span>
                    <span className="font-mono text-[0.6rem] text-muted tracking-tight">/{page.slug}</span>
                    <span className="text-[0.75rem] text-muted group-hover:text-accent group-hover:translate-x-1 transition-all duration-200">&rarr;</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

    </div>
  )
}
