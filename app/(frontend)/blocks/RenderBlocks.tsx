import type { Page } from '@/payload-types'
import { HeroBlock } from './HeroBlock'
import { ContentBlock } from './ContentBlock'
import { CallToActionBlock } from './CallToActionBlock'
import { FAQBlock } from './FAQBlock'

type BlockData = Page['layout'][number]

const blockComponents: Record<BlockData['blockType'], React.ComponentType<{ block: BlockData }>> = {
  hero: HeroBlock as React.ComponentType<{ block: BlockData }>,
  content: ContentBlock as React.ComponentType<{ block: BlockData }>,
  callToAction: CallToActionBlock as React.ComponentType<{ block: BlockData }>,
  faq: FAQBlock as React.ComponentType<{ block: BlockData }>,
}

export function RenderBlocks({ blocks }: { blocks: Page['layout'] }) {
  if (!blocks || blocks.length === 0) return null

  return (
    <div>
      {blocks.map((block, i) => {
        const Block = blockComponents[block.blockType]
        if (!Block) return null
        return <Block key={i} block={block} />
      })}
    </div>
  )
}
