import { RichText } from '@payloadcms/richtext-lexical/react'
import type { Page } from '@/payload-types'

type FAQBlockData = Extract<Page['layout'][number], { blockType: 'faq' }>

export function FAQBlock({ block }: { block: FAQBlockData }) {
  return (
    <section className="px-8 py-24 bg-surface">
      <div className="max-w-[720px] mx-auto">
        <div className="border-b border-rule py-6 first:border-t first:border-rule">
          <h3 className="text-xl font-semibold leading-tight flex items-start gap-4">
            <span className="font-mono text-[0.6rem] font-bold text-accent border-2 border-accent w-[26px] h-[26px] flex items-center justify-center shrink-0 mt-0.5">
              Q
            </span>
            {block.question}
          </h3>
          <div className="pl-[calc(26px+1rem)] mt-2 [&_p]:text-[0.95rem] [&_p]:leading-[1.75] [&_p]:text-dim [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-[3px]">
            <RichText data={block.answer} />
          </div>
        </div>
      </div>
    </section>
  )
}
