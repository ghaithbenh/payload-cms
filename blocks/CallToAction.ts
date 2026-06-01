import type { Block } from 'payload'

export const CallToAction: Block = {
  slug: 'callToAction',
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'text',
    },
    {
      name: 'buttonLabel',
      type: 'text',
      required: true,
    },
    {
      name: 'buttonUrl',
      type: 'text',
      required: true,
    },
    {
      name: 'variant',
      type: 'select',
      options: [
        { label: 'Primary', value: 'primary' },
        { label: 'Secondary', value: 'secondary' },
      ],
      defaultValue: 'primary',
    },
  ],
}
