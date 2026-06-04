import { RichText } from '@payloadcms/richtext-lexical/react'
import type { Page } from '@/payload-types'

type ContentBlockData = Extract<Page['layout'][number], { blockType: 'content' }>

export function ContentBlock({ block }: { block: ContentBlockData }) {
  return (
    <section className="px-8 py-24">
      <div className="max-w-[720px] mx-auto [&_h1]:text-[2.2rem] [&_h1]:font-bold [&_h1]:tracking-tight [&_h1]:text-light [&_h1]:mt-8 [&_h1]:mb-2 [&_h2]:text-[1.6rem] [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-light [&_h2]:mt-8 [&_h2]:mb-2 [&_h3]:text-[1.2rem] [&_h3]:font-bold [&_h3]:tracking-tight [&_h3]:text-light [&_h3]:mt-8 [&_h3]:mb-2 [&_p]:leading-[1.8] [&_p]:mb-5 [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-[3px] [&_blockquote]:border-l-3 [&_blockquote]:border-accent [&_blockquote]:pl-6 [&_blockquote]:my-8 [&_blockquote]:italic [&_blockquote]:text-dim">
        <RichText data={block.richText} />
      </div>
    </section>
  )
}
