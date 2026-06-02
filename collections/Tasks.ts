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
            if (user.role === 'admin') return true;

            return {
                assignedTo: {
                    equals: user.id,
                },
            };
        },

        update: ({ req }) => {
            const user = req.user;
            if (!user) return false;
            if (user.role === 'admin') return true;

            return {
                assignedTo: {
                    equals: user.id,
                },
            };
        },

        delete: ({ req }) => {
            const user = req.user;
            if (!user) return false;
            if (user.role === 'admin') return true;

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
                { label: "Review", value: "review" },
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
            name: "statusHistory",
            type: "array",
            admin: {
                readOnly: true,
            },
            fields: [
                {
                    name: "from",
                    type: "text",
                },
                {
                    name: "to",
                    type: "text",
                    required: true,
                },
                {
                    name: "changedBy",
                    type: "relationship",
                    relationTo: "users",
                },
                {
                    name: "changedAt",
                    type: "date",
                    required: true,
                },
            ],
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
                    Field: "@/components/SubscribeField#SubscribeField",
                },
                position: "sidebar",
            },
        },
    ],

    hooks: {
        beforeChange: [
            ({ data, originalDoc, req }) => {
                if (!data.status || data.status === originalDoc?.status) return;

                const user = req.user;
                if (!user) throw new Error('Not authenticated');

                const assignedId =
                    typeof originalDoc.assignedTo === 'object'
                        ? (originalDoc.assignedTo as any)?.id
                        : originalDoc.assignedTo;

                if (user.role !== 'admin' && user.id !== assignedId) {
                    throw new Error('Only the assigned user can change task status');
                }

                const validTransitions: Record<string, string> = {
                    'pending': 'in-progress',
                    'in-progress': 'review',
                    'review': 'completed',
                };

                if (validTransitions[originalDoc.status] !== data.status) {
                    throw new Error(
                        `Cannot transition from "${originalDoc.status}" to "${data.status}". ` +
                        `Allowed: ${originalDoc.status} → ${validTransitions[originalDoc.status]}`
                    );
                }

                const history = [...(originalDoc.statusHistory || [])];
                history.push({
                    from: originalDoc.status,
                    to: data.status,
                    changedBy: user.id,
                    changedAt: new Date().toISOString(),
                });

                data.statusHistory = history;
            },
        ],
    },
};
