import type { CollectionConfig } from 'payload'

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
      const user = req.user
      if (!user) return false
      if (user.role === 'admin') return true
      return { id: { equals: user.id } }
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
        { label: 'User', value: 'user' },
      ],
      access: {
        create: ({ req }) => req.user?.role === 'admin',
        update: ({ req }) => req.user?.role === 'admin',
      },
    },
  ]
}
