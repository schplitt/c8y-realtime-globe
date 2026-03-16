/* eslint-disable no-console */
/* eslint-disable node/prefer-global/process */
import type { IManagedObject, IResultList } from '@c8y/client'

import {
  assertConfig,
  createClient,
  DEVICE_BLUEPRINTS,
  GROUP_IDS,
  PAGE_SIZE,
} from './c8y-script.shared.js'

const DELETE_CHUNK_LOG_INTERVAL = 25

type PagedManagedObjectResult = IResultList<IManagedObject>

function chunkValues<T>(values: readonly T[], chunkSize: number): T[][] {
  const chunks: T[][] = []

  for (let index = 0; index < values.length; index += chunkSize) {
    chunks.push(values.slice(index, index + chunkSize))
  }

  return chunks
}

async function collectPagedResults(initialPage: PagedManagedObjectResult): Promise<IManagedObject[]> {
  const results = [...initialPage.data]
  let currentPage = initialPage
  const visitedPages = new Set<number>()

  if (typeof currentPage.paging?.currentPage === 'number') {
    visitedPages.add(currentPage.paging.currentPage)
  }

  while (currentPage.paging?.nextPage) {
    const nextPageNumber = currentPage.paging.nextPage

    if (visitedPages.has(nextPageNumber)) {
      break
    }

    visitedPages.add(nextPageNumber)

    const nextPage = await currentPage.paging.next()

    if (nextPage.data.length === 0) {
      break
    }

    results.push(...nextPage.data)
    currentPage = nextPage
  }

  return results
}

async function findSeededDevices(client: Awaited<ReturnType<typeof createClient>>): Promise<IManagedObject[]> {
  const firstPage = await client.inventory.listQuery({
    __and: [
      { __has: 'c8y_IsDevice' },
      { type: { __in: DEVICE_BLUEPRINTS.map(({ type }) => type) } },
      { 'mockSeedMeta.sourceGroupId': { __in: [...GROUP_IDS] } },
    ],
  }, {
    pageSize: PAGE_SIZE,
    withTotalPages: true,
  })

  return collectPagedResults(firstPage)
}

async function main(): Promise<void> {
  assertConfig()

  const client = await createClient()
  const seededDevices = await findSeededDevices(client)

  if (seededDevices.length === 0) {
    console.log('No seeded mock devices found.')
    return
  }

  console.log(`Deleting ${seededDevices.length} seeded mock devices...`)

  let deletedCount = 0

  for (const deviceChunk of chunkValues(seededDevices, DELETE_CHUNK_LOG_INTERVAL)) {
    await Promise.all(deviceChunk.map(async ({ id }) => {
      await client.inventory.delete(id, { cascade: true })
    }))

    deletedCount += deviceChunk.length
    console.log(`Deleted ${deletedCount}/${seededDevices.length} devices...`)
  }

  console.log(`Finished. Deleted ${deletedCount} seeded mock devices.`)
}

main().catch((error: unknown) => {
  console.error('Failed to clean up seeded mock devices.')
  console.error(error)
  process.exitCode = 1
})
