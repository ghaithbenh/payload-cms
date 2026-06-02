import type { CollectionConfig } from "payload";

export const Tasks: CollectionConfig = {
    slug: "tasks",
    folders: true,

    admin: {
        useAsTitle: "title",
        defaultColumns: ["title", "status", "openApp"],
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

            return {
                assignedTo: {
                    equals: user.id,
                },
            };
        },

        update: ({ req }) => {
            const user = req.user;
            if (!user) return false;

            return {
                assignedTo: {
                    equals: user.id,
                },
            };
        },

        delete: ({ req }) => {
            const user = req.user;
            if (!user) return false;

            return {
                assignedTo: {
                    equals: user.id,
                },
            };
        },
    },

    fields: [
        {
            name: "title",
            type: "text",
            required: true,
        },
        {
            name: "description",
            type: "text",
            required: true,
        },
        {
            name: "status",
            type: "select",
            options: [
                { label: "Pending", value: "pending" },
                { label: "In Progress", value: "in-progress" },
                { label: "Completed", value: "completed" },
            ],
            required: true,
        },
        {
            name: "assignedTo",
            type: "relationship",
            relationTo: "users",
        },
        {
            name: "dueDate",
            type: "date",
        },
        {
            name: "taskPic",
            type: "upload",
            relationTo: "media",
        },
        {
            name: "taskDoc",
            type: "upload",
            relationTo: "documents",
        },
        {
            name: "taskVideo",
            type: "upload",
            relationTo: "videos",
        },
        {
            name: "openApp",
            type: "ui",
            admin: {
                disableListColumn: false,
                components: {
                    Cell: "@/components/admin/OpenAppCell",
                },
            },
        },
        {
            name: "subscribed",
            type: "text",
            admin: {
                components: {
                    Field: "/components/SubscribeField#SubscribeField",
                },
                position: "sidebar",
            },
        },
    ],
};