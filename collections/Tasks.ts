import type { CollectionConfig, Where, PayloadRequest } from "payload";
import type { User } from "@/payload-types";
import { invalidateCollection } from "@/lib/cache";
import { enqueueNotification } from "../lib/queue";

const adminOrManager = ({ req }: { req: PayloadRequest }) => {
    const user = req.user as User | null;
    return user?.role !== 'user';
};

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
            const user = req.user as User | null;
            if (!user) return false;
            if (user.role === 'admin') return true;
            if (user.role === 'manager') {
                const query: Where = { team: { equals: user.id } };
                return query;
            }
            const query: Where = { assignedTo: { equals: user.id } };
            return query;
        },

        update: ({ req }) => {
            const user = req.user as User | null;
            if (!user) return false;
            if (user.role === 'admin') return true;
            if (user.role === 'manager') {
                const query: Where = { team: { equals: user.id } };
                return query;
            }
            const query: Where = { assignedTo: { equals: user.id } };
            return query;
        },

        delete: ({ req }) => {
            const user = req.user as User | null;
            if (!user) return false;
            if (user.role === 'admin') return true;
            if (user.role === 'manager') {
                const query: Where = { team: { equals: user.id } };
                return query;
            }
            const query: Where = { assignedTo: { equals: user.id } };
            return query;
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
            async ({ data, originalDoc, req, operation }) => {
                // Auto-assign to least busy user on create if no one assigned
                if (operation === 'create' && !data.assignedTo) {
                    const creator = req.user as User | null
                    if (creator?.role === 'user') {
                        data.assignedTo = creator.id
                        req.payload.logger?.info?.(`Auto-assigned task to creator ${creator.id}`)
                    } else {
                        try {
                            const { docs: users } = await req.payload.find({
                                collection: 'users',
                                depth: 0,
                                pagination: false,
                            });

                            if (users && users.length > 0) {
                                const userTaskCounts = await Promise.all(
                                    users.map(async (user) => {
                                        const { totalDocs } = await req.payload.count({
                                            collection: 'tasks',
                                            where: { assignedTo: { equals: user.id } },
                                        });
                                        return { id: user.id, count: totalDocs };
                                    })
                                );

                                const leastBusy = userTaskCounts.reduce((min, curr) =>
                                    curr.count < min.count ? curr : min,
                                );

                                data.assignedTo = leastBusy.id;
                                req.payload.logger?.info?.(
                                    `Auto-assigned task to user ${leastBusy.id} (${leastBusy.count} existing tasks), creator is ${req.user?.id}`
                                );
                            } else {
                                req.payload.logger?.warn?.('Auto-assignment skipped: no users found');
                            }
                        } catch (err) {
                            req.payload.logger?.error?.({ err }, 'Auto-assignment failed');
                        }
                    }
                }

                // Team mapping: resolve assigned user's manager
                const newAssignedId =
                    data.assignedTo && typeof data.assignedTo === 'object'
                        ? data.assignedTo.id
                        : data.assignedTo;

                const oldAssignedId =
                    originalDoc?.assignedTo && typeof originalDoc.assignedTo === 'object'
                        ? originalDoc.assignedTo.id
                        : originalDoc?.assignedTo;

                if (newAssignedId && newAssignedId !== oldAssignedId) {
                    try {
                        const assignedUser = await req.payload.findByID({
                            collection: 'users',
                            id: newAssignedId,
                            depth: 0,
                        }) as User | null;
                        data.team = assignedUser?.manager || null;
                    } catch (err) {
                        req.payload.logger?.error?.(
                            { newAssignedId, error: err },
                            'Failed to resolve team mapping'
                        );
                    }
                }

                // Status transition validation (skip on create)
                if (operation === 'create' || !data.status || data.status === originalDoc?.status) return;

                const user = req.user as User | null;
                if (!user) throw new Error('Not authenticated');

                const prevStatus = originalDoc?.status || 'pending';

                const assignedId =
                    originalDoc?.assignedTo && typeof originalDoc.assignedTo === 'object'
                        ? originalDoc.assignedTo.id
                        : originalDoc?.assignedTo;

                if (user.role !== 'admin' && user.role !== 'manager' && user.id !== assignedId) {
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
        afterChange: [
            async ({ doc, operation, req }) => {
                const assignedToId =
                    doc.assignedTo && typeof doc.assignedTo === 'object'
                        ? doc.assignedTo.id
                        : doc.assignedTo;

                await invalidateCollection('tasks', doc.id);

                if (assignedToId) {
                    try {
                        const action = operation === 'create' ? 'created' : 'updated';
                        enqueueNotification({
                            userId: assignedToId,
                            message: `Task "${doc.title}" was ${action}`,
                            type: 'info',
                        });
                    } catch (err) {
                        req.payload.logger?.error?.({ err }, 'Failed to create notification');
                    }
                }
            },
        ],
        afterDelete: [
            async ({ doc }) => {
                await invalidateCollection('tasks', doc.id);
            },
        ],
    },
};
