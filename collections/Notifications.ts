import type { CollectionConfig, Where } from "payload";
import type { User } from "@/payload-types";
import { invalidateCollection } from "@/lib/cache";

export const Notifications: CollectionConfig = {
    slug: "notifications",

    admin: {
        useAsTitle: "message",
        defaultColumns: ["message", "type", "read", "createdAt"],
    },

    access: {
        create: ({ req }) => {
            return {
                userId: { equals: req.user?.id },
            };
        },
        read: ({ req }) => {
            const user = req.user as User | null;
            if (!user) return false;
            const query: Where = { userId: { equals: user.id } };
            return query;
        },
        update: ({ req }) => {
            const user = req.user as User | null;
            if (!user) return false;
            const query: Where = { userId: { equals: user.id } };
            return query;
        },
        delete: ({ req }) => {
            const user = req.user as User | null;
            if (!user) return false;
            return user.role === 'admin';
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

    hooks: {
        afterChange: [
            async ({ doc }) => {
                await invalidateCollection('notifications', doc.id);
            },
        ],
        afterDelete: [
            async ({ doc }) => {
                await invalidateCollection('notifications', doc.id);
            },
        ],
    },
};
