import type { CollectionConfig } from "payload";

export const ContactSubmissions: CollectionConfig = {
    slug: 'contact-submissions',
    trash: true,
    access: {
        read: ({ req }) => {
            if (!req.user) return false;
            return true;
        },
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
            name: 'email',
            type: 'text',
            required: true,
        },
        {
            name: 'message',
            type: 'textarea',
            required: true,
        },
    ],
}