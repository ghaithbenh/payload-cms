import type { CollectionConfig } from 'payload'

export const Documents: CollectionConfig = {
    slug: 'documents',
    trash: true,

    access: {
        read: () => true,
    },

    fields: [
        {
            name: 'alt',
            type: 'text',
            required: true,
        },
        {
            name: "title",
            type: "text",
            required: true
        }
    ],

    upload: {
        mimeTypes: ['application/pdf'],
    },
}