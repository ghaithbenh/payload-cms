import type { CollectionConfig } from "payload";

export const Categories: CollectionConfig = {
    slug: 'categories',
    trash: true,
    access: {
        create: ({ req }) => req.user?.role === 'admin',
        read: () => true,  // Depends on your needs
        update: ({ req }) => req.user?.role === 'admin',
        delete: ({ req }) => req.user?.role === 'admin',
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
