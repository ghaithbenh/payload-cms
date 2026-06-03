import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@/payload.config'

async function backfillTeam() {
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })

  const tasks = await payload.find({
    collection: 'tasks',
    where: {
      team: { equals: null },
      assignedTo: { not_equals: null },
    },
    depth: 0,
    pagination: false,
  })

  let updated = 0
  for (const task of tasks.docs) {
    const assignedId =
      typeof task.assignedTo === 'object'
        ? (task.assignedTo as any)?.id
        : task.assignedTo

    if (!assignedId) continue

    const assignedUser = await payload.findByID({
      collection: 'users',
      id: assignedId as string,
      depth: 0,
    })

    const managerId = (assignedUser as any)?.manager
    if (!managerId) continue

    await payload.update({
      collection: 'tasks',
      id: task.id,
      data: { team: managerId },
      overrideAccess: true,
    })
    updated++
  }

  console.log(`Backfill complete. Updated ${updated} tasks.`)
}

backfillTeam().catch((err) => {
  console.error('Backfill failed:', err)
  process.exit(1)
})