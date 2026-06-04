import type { Page } from '@/payload-types'
import { HeroBlock } from './HeroBlock'
import { ContentBlock } from './ContentBlock'
import { CallToActionBlock } from './CallToActionBlock'
import { FAQBlock } from './FAQBlock'

const blockComponents = {
  hero: HeroBlock,
  content: ContentBlock,
  callToAction: CallToActionBlock,
  faq: FAQBlock,
} as const

export function RenderBlocks({ blocks }: { blocks: Page['layout'] }) {
  if (!blocks || blocks.length === 0) return null

  return (
    <div>
      {blocks.map((block, i) => {
        const Block = blockComponents[block.blockType as keyof typeof blockComponents]
        if (!Block) return null
        return <Block key={i} block={block} />
      })}
    </div>
  )
}
