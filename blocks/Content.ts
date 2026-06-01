import type { Block } from 'payload'

export const Content: Block = {
  slug: 'content',
  fields: [
    {
      name: 'richText',
      type: 'richText',
      required: true,
    },
  ],
}
