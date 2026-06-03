import type { CollectionConfig } from "payload";

const adminOrManager = ({ req }: { req: any }) =>
    (req.user?.role as string) !== 'user';

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
            if (user.role === 'manager') return { team: { equals: user.id } } as any;
            return { assignedTo: { equals: user.id } } as any;
        },

        update: ({ req }) => {
            const user = req.user;
            if (!user) return false;
            if (user.role === 'admin') return true;
            if (user.role === 'manager') return { team: { equals: user.id } } as any;
            return { assignedTo: { equals: user.id } } as any;
        },

        delete: ({ req }) => {
            const user = req.user;
            if (!user) return false;
            if (user.role === 'admin') return true;
            if (user.role === 'manager') return { team: { equals: user.id } } as any;
            return { assignedTo: { equals: user.id } } as any;
        },
    },

    fields: [
        {
            name: "title",
            type: "text",
            required: true,
            access: { update: adminOrManager },
        },
        {
            name: "description",
            type: "text",
            required: true,
            access: { update: adminOrManager },
        },
        {
            name: "status",
            type: "select",
            defaultValue: "pending",
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
            access: { update: adminOrManager },
        },
        {
            name: "team",
            type: "relationship",
            relationTo: "users",
            admin: {
                hidden: true,
            },
            access: { create: adminOrManager, update: adminOrManager },
        },
        {
            name: "dueDate",
            type: "date",
            access: { update: adminOrManager },
        },
        {
            name: "taskPic",
            type: "upload",
            relationTo: "media",
            access: { update: adminOrManager },
        },
        {
            name: "taskDoc",
            type: "upload",
            relationTo: "documents",
            access: { update: adminOrManager },
        },
        {
            name: "taskVideo",
            type: "upload",
            relationTo: "videos",
            access: { update: adminOrManager },
        },
        {
            name: "statusHistory",
            type: "array",
            admin: {
                readOnly: true,
            },
            access: { update: adminOrManager },
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
            access: { update: adminOrManager },
        },
    ],

    hooks: {
        beforeChange: [
            async ({ data, originalDoc, req }) => {
                const newAssignedId =
                    typeof data.assignedTo === 'object'
                        ? (data.assignedTo as any)?.id
                        : data.assignedTo;

                const oldAssignedId =
                    typeof originalDoc?.assignedTo === 'object'
                        ? (originalDoc?.assignedTo as any)?.id
                        : originalDoc?.assignedTo;

                if (newAssignedId && newAssignedId !== oldAssignedId) {
                    try {
                        const assignedUser = await req.payload.findByID({
                            collection: 'users',
                            id: newAssignedId,
                            depth: 0,
                        });
                        data.team = (assignedUser as any)?.manager || null;
                    } catch {
                        // leave team unchanged if lookup fails
                    }
                }

                if (!originalDoc || !data.status || data.status === originalDoc?.status) return;

                const user = req.user;
                if (!user) throw new Error('Not authenticated');

                const prevStatus = originalDoc?.status || 'pending';

                const assignedId =
                    typeof originalDoc?.assignedTo === 'object'
                        ? (originalDoc?.assignedTo as any)?.id
                        : originalDoc?.assignedTo;

                if ((user.role as string) !== 'admin' && (user.role as string) !== 'manager' && user.id !== assignedId) {
                    throw new Error('Only the assigned user can change task status');
                }

                const validTransitions: Record<string, string> = {
                    'pending': 'in-progress',
                    'in-progress': 'review',
                    'review': 'completed',
                };

                if (validTransitions[prevStatus] !== data.status) {
                    throw new Error(
                        `Cannot transition from "${prevStatus}" to "${data.status}". ` +
                        `Allowed: ${prevStatus} → ${validTransitions[prevStatus]}`
                    );
                }

                const history = [...(originalDoc?.statusHistory || [])];
                history.push({
                    from: prevStatus,
                    to: data.status,
                    changedBy: user.id,
                    changedAt: new Date().toISOString(),
                });

                data.statusHistory = history;
            },
        ],
    },
};
