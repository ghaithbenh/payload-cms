import { getPayload } from 'payload'
import { notFound } from 'next/navigation'
import config from '@/payload.config'
import { RenderBlocks } from '../blocks/RenderBlocks'

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })

  const pages = await payload.find({
    collection: 'pages',
    where: { slug: { equals: slug.toLowerCase() } },
    limit: 1,
  })

  const page = pages.docs[0]
  if (!page) notFound()

  return (
    <div className="min-h-screen">
      <div className="px-8 py-[10px] border-b border-rule bg-gradient-to-b from-surface to-transparent">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <h1 className="font-mono text-[1.1rem] font-bold tracking-tight m-0">{page.title}</h1>
          <span className="font-mono text-[0.6rem] font-medium uppercase tracking-[0.15em] text-muted">/{page.slug}</span>
        </div>
      </div>
      <RenderBlocks blocks={page.layout} />
    </div>
  )
}
