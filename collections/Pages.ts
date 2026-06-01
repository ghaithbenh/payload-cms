import type { CollectionConfig } from 'payload'

import { Hero } from '../blocks/Hero'
import { Content } from '../blocks/Content'
import { CallToAction } from '../blocks/CallToAction'
import { FAQ } from '../blocks/FAQ'

export const Pages: CollectionConfig = {
  slug: 'pages',
  trash: true,
  admin: {
    useAsTitle: 'title',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: {
        components: {
          Field: '/components/CustomField#CustomField',
        },
      },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'layout',
      type: 'blocks',
      blocks: [Hero, Content, CallToAction, FAQ],
      required: true,
    },
  ],
}
