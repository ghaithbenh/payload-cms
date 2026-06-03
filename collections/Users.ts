import type { CollectionConfig, Where } from 'payload'
import type { User } from '@/payload-types'
import { invalidateCollection } from '@/lib/cache'

export const Users: CollectionConfig = {
  slug: 'users',
  trash: true,
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  access: {
    create: ({ req }) => req.user?.role === 'admin',
    read: ({ req }) => {
      const user = req.user as User | null
      if (!user) return false
      if (user.role !== 'user') return true

      const managerId =
        user.manager && typeof user.manager === 'object'
          ? user.manager.id
          : user.manager

      if (managerId) {
        const query: Where = {
          or: [{ id: { equals: user.id } }, { id: { equals: managerId } }],
        }
        return query
      }

      const query: Where = { id: { equals: user.id } }
      return query
    },
    update: ({ req }) => req.user?.role === 'admin',
    delete: ({ req }) => req.user?.role === 'admin',
  },
  fields: [
    {
      name: 'firstName',
      type: 'text',
    },
    {
      name: 'lastName',
      type: 'text',
    },
    {
      name: 'role',
      type: 'select',
      defaultValue: 'user',
      required: true,
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Manager', value: 'manager' },
        { label: 'User', value: 'user' },
      ],
      access: {
        create: ({ req }) => req.user?.role === 'admin',
        update: ({ req }) => req.user?.role === 'admin',
      },
    },
    {
      name: 'manager',
      type: 'relationship',
      relationTo: 'users',
      hasMany: false,
      admin: {
        condition: (data) => data?.role !== 'manager' && data?.role !== 'admin',
      },
    },
  ],

  hooks: {
    afterChange: [
      async ({ doc }) => {
        await invalidateCollection('users', doc.id);
      },
    ],
    afterDelete: [
      async ({ doc }) => {
        await invalidateCollection('users', doc.id);
      },
    ],
  },
}
