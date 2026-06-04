import type { Page } from '@/payload-types'

type BlockData = Page['layout'][number]
type CallToActionBlockData = Extract<BlockData, { blockType: 'callToAction' }>

export function CallToActionBlock({ block: rawBlock }: { block: BlockData }) {
  const block = rawBlock as CallToActionBlockData
  const isPrimary = (block.variant || 'primary') === 'primary'
  const link = block.link
  let href = ''
  if (link?.type === 'internal' && link.reference) {
    const reference = link.reference
    href = typeof reference.value === 'object' ? `/${reference.value.slug}` : `/${reference.value}`
  } else if (link?.type === 'custom') {
    href = link.url || ''
  }

  return (
    <section className="px-8 py-24">
      <div className="max-w-5xl mx-auto px-16 py-20 border-2 border-dim text-center">
        <span className="block font-mono text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-accent mb-4">
          Take Action
        </span>
        <h2 className="text-[clamp(1.8rem,4vw,3rem)] font-bold tracking-tight leading-tight mb-4">
          {block.title}
        </h2>
        {block.description && (
          <p className="text-lg text-dim max-w-[480px] mx-auto mb-8 leading-relaxed">
            {block.description}
          </p>
        )}
        {link?.label && href && (
          <a
            href={href}
            target={link.newTab ? '_blank' : undefined}
            rel={link.newTab ? 'noopener noreferrer' : undefined}
            className={`inline-flex items-center gap-2 font-mono text-[0.75rem] font-semibold uppercase tracking-[0.14em] px-6 py-4 transition-all duration-300 no-underline hover:-translate-y-0.5 ${
              isPrimary
                ? 'bg-light text-ink hover:bg-accent hover:text-light'
                : 'bg-transparent text-light border-2 border-dim hover:border-light'
            }`}
          >
            {link.label}
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-300">
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          </a>
        )}
      </div>
    </section>
  )
}

