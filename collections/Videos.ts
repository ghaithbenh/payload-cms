import type { CollectionConfig } from 'payload'

export const Videos: CollectionConfig = {
    slug: 'videos',
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
        mimeTypes: ['video/*'],
    },
}