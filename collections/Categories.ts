import type { CollectionConfig } from "payload";

export const Categories: CollectionConfig = {
    slug: 'categories',
    trash: true,
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
    ],
}
