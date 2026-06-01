import Image from 'next/image'

export function HeroBlock({ block }: { block: any }) {
  const hasImage = block.backgroundImage && typeof block.backgroundImage !== 'string'

  return (
    <section
      className={`relative min-h-[80vh] flex flex-col justify-end px-8 py-32 overflow-hidden ${!hasImage ? 'justify-center text-center bg-gradient-to-br from-ink to-[#2d2d2d]' : ''}`}
    >
      {hasImage && (
        <div className="absolute inset-0 z-0">
          <Image
            src={block.backgroundImage.url}
            alt={block.backgroundImage.alt || ''}
            fill
            className="object-cover brightness-[0.45] contrast-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
        </div>
      )}
      <div className={`relative z-10 max-w-5xl mx-auto w-full ${!hasImage ? 'flex flex-col items-center' : ''}`}>
        <h1 className="text-[clamp(2.5rem,6vw,5rem)] font-bold leading-[1.05] tracking-tight text-light max-w-[800px] mb-6">
          {block.title}
        </h1>
        {block.subtitle && (
          <p className="text-xl text-dim max-w-[520px] leading-relaxed mb-8">
            {block.subtitle}
          </p>
        )}
        {block.cta?.label && (
          <a
            href={block.cta.url}
            className="inline-flex items-center gap-2 text-[0.75rem] font-semibold uppercase tracking-[0.14em] px-6 py-4 bg-light text-ink hover:bg-accent hover:text-light hover:-translate-y-0.5 transition-all duration-300 no-underline"
          >
            {block.cta.label}
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-300">
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          </a>
        )}
      </div>
    </section>
  )
}
