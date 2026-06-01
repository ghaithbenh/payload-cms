import type { CollectionConfig } from 'payload'

export const Products: CollectionConfig = {
    slug: "products",
    trash: true,
    admin: {
        useAsTitle: "name",
    },
    fields: [
        {
            name: "name",
            type: "text",
            required: true,
        },
        {
            name: "price",
            type: "number",
            required: true,
        },
        {
            name: "description",
            type: "text",
            required: true,
            admin: {
                components: {
                    Field: '/components/CustomField#CustomField',
                    Cell: '/components/CustomCell#CustomCell',
                },
            },
        },
        {
            name: "image",
            type: "upload",
            relationTo: "media",
            required: true,
        },
    ],
}