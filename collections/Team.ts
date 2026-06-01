import type { CollectionConfig } from "payload";

export const Team: CollectionConfig = {
    slug: 'team',
    access: {
        read: () => true,
    },
    admin: {
        useAsTitle: "name",
    },
    fields: [
        {
            name: 'name',
            type: 'text',
            required: true,
        },
        {
            name: 'position',
            type: 'text',
            required: true,
        },
        {
            name: 'image',
            type: 'upload',
            relationTo: 'media',
        },
        {
            name: 'description',
            type: 'textarea',
            required: true,
        },
        {
            name: 'phone',
            type: 'text',
            required: true,
        },
        {
            name: 'email',
            type: 'text',
            required: true,
        },
        {
            name: 'address',
            type: 'text',
            required: true,
        },
        {
            name: 'category',
            type: 'relationship',
            relationTo: 'categories',
            required: true,
        },
    ],
}
