import type { Block } from 'payload'

export const FAQ: Block = {
  slug: 'faq',
  fields: [
    {
      name: 'question',
      type: 'text',
      required: true,
    },
    {
      name: 'answer',
      type: 'richText',
      required: true,
    },
  ],
}
