import type { CollectionConfig } from "payload";

export const Notifications: CollectionConfig = {
    slug: "notifications",

    admin: {
        useAsTitle: "message",
        defaultColumns: ["message", "type", "read", "createdAt"],
    },

    access: {
        create: ({ req }) => {
            const user = req.user;
            if (!user) return false;
            return true;
        },
        read: ({ req }) => {
            const user = req.user;
            if (!user) return false;
            return { userId: { equals: user.id } } as any;
        },
        update: ({ req }) => {
            const user = req.user;
            if (!user) return false;
            return { userId: { equals: user.id } } as any;
        },
        delete: ({ req }) => {
            const user = req.user;
            if (!user) return false;
            return (user.role as string) === 'admin';
        },
    },

    fields: [
        {
            name: "userId",
            type: "relationship",
            relationTo: "users",
            required: true,
        },
        {
            name: "message",
            type: "text",
            required: true,
        },
        {
            name: "type",
            type: "select",
            defaultValue: "info",
            required: true,
            options: [
                { label: "Info", value: "info" },
                { label: "Success", value: "success" },
                { label: "Warning", value: "warning" },
                { label: "Error", value: "error" },
            ],
        },
        {
            name: "read",
            type: "checkbox",
            defaultValue: false,
        },
    ],
};
