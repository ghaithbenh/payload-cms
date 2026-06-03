import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  trash: true,
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  access: {
    create: ({ req }) => (req.user?.role as string) === 'admin',
    read: ({ req }) => {
      const user = req.user
      if (!user) return false
      if ((user.role as string) !== 'user') return true

      const managerId =
        user.manager && typeof user.manager === 'object'
          ? (user.manager as any).id
          : user.manager

      if (managerId) {
        return {
          or: [{ id: { equals: user.id } }, { id: { equals: managerId } }],
        } as any
      }

      return { id: { equals: user.id } } as any
    },
    update: ({ req }) => (req.user?.role as string) === 'admin',
    delete: ({ req }) => (req.user?.role as string) === 'admin',
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
        create: ({ req }) => (req.user?.role as string) === 'admin',
        update: ({ req }) => (req.user?.role as string) === 'admin',
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
}
