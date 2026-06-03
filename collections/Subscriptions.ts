import type { CollectionConfig } from "payload";

export const Subscriptions: CollectionConfig = {
    slug: 'subscriptions',
    trash: true,
    access: {
        create: ({ req }) => !!req.user,
        read: ({ req }) => !!req.user,
        update: ({ req }) => req.user?.role === "admin",
        delete: ({ req }) => req.user?.role === "admin",
    },
    admin: {
        useAsTitle: "name",
    },
    fields: [
        {
            name: 'name',
            type: 'text',
            required: true,
            admin: {
                components: {
                    Field: '@/components/SubscribeField#SubscribeField',
                },
            },
        },
        {
            name: 'email',
            type: 'text',
            required: true,
        },
        {
            name: 'plan',
            type: 'select',
            required: true,
            options: [
                { label: 'Basic', value: 'basic' },
                { label: 'Premium', value: 'premium' },
                { label: 'Enterprise', value: 'enterprise' },
            ],
        },
        {
            name: 'status',
            type: 'select',
            required: true,
            defaultValue: 'active',
            options: [
                { label: 'Active', value: 'active' },
                { label: 'Cancelled', value: 'cancelled' },
                { label: 'Expired', value: 'expired' },
            ],
        },
        {
            name: 'startDate',
            type: 'date',
            required: true,
        },
        {
            name: 'endDate',
            type: 'date',
        },
    ],
}
