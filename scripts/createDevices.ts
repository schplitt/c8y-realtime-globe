/* eslint-disable no-console */
/* eslint-disable node/prefer-global/process */
import type { IManagedObject } from '@c8y/client'

import {
  assertConfig,
  createClient,
  DEVICE_BLUEPRINTS,
  DEVICES_PER_GROUP,
  GROUP_CLUSTERS,
  GROUP_IDS,
  POSITION_RATIO,
} from './c8y-script.shared.js'
import type { DeviceBlueprint } from './c8y-script.shared.js'

const BULK_ADD_CHUNK_SIZE = 100

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function normalizeLongitude(value: number): number {
  if (value > 180) {
    return value - 360
  }

  if (value < -180) {
    return value + 360
  }

  return value
}

function shuffleValues<T>(values: readonly T[]): T[] {
  const shuffled = [...values]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const current = shuffled[index]
    shuffled[index] = shuffled[swapIndex]
    shuffled[swapIndex] = current
  }

  return shuffled
}

function createPosition(groupId: string): NonNullable<IManagedObject['c8y_Position']> {
  const cluster = GROUP_CLUSTERS[groupId]

  const lat = clamp(
    randomBetween(cluster.lat - cluster.latSpread, cluster.lat + cluster.latSpread),
    -85,
    85,
  )
  const lng = normalizeLongitude(
    randomBetween(cluster.lng - cluster.lngSpread, cluster.lng + cluster.lngSpread),
  )

  return {
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
  }
}

function buildPositionFlags(count: number, ratio: number): boolean[] {
  const positionedCount = Math.round(count * ratio)

  return shuffleValues([
    ...Array.from({ length: positionedCount }, () => true),
    ...Array.from({ length: count - positionedCount }, () => false),
  ])
}

function buildDeviceName(groupIndex: number, deviceIndex: number, blueprint: DeviceBlueprint): string {
  const areaPrefixes = ['North Yard', 'Harbor', 'Delta', 'Atlas', 'Summit', 'Riverbend']
  const qualifier = areaPrefixes[(groupIndex + deviceIndex) % areaPrefixes.length]
  const serial = String(groupIndex * DEVICES_PER_GROUP + deviceIndex + 1).padStart(3, '0')

  return `${qualifier} ${blueprint.label} ${serial}`
}

function buildDeviceDraft(
  groupId: string,
  groupIndex: number,
  deviceIndex: number,
  withPosition: boolean,
): Partial<IManagedObject> {
  const blueprint = DEVICE_BLUEPRINTS[(groupIndex * DEVICES_PER_GROUP + deviceIndex) % DEVICE_BLUEPRINTS.length]
  const device: Partial<IManagedObject> = {
    name: buildDeviceName(groupIndex, deviceIndex, blueprint),
    type: blueprint.type,
    c8y_IsDevice: {},
    mockMeasurementProfile: blueprint.measurementProfile,
    mockSeedMeta: {
      sourceGroupId: groupId,
      template: blueprint.label,
    },
  }

  if (withPosition) {
    device.c8y_Position = createPosition(groupId)
  }

  return device
}

function chunkValues<T>(values: readonly T[], chunkSize: number): T[][] {
  const chunks: T[][] = []

  for (let index = 0; index < values.length; index += chunkSize) {
    chunks.push(values.slice(index, index + chunkSize))
  }

  return chunks
}

async function main(): Promise<void> {
  assertConfig()

  const client = await createClient()

  console.log(`Creating ${DEVICES_PER_GROUP * GROUP_IDS.length} mock devices across ${GROUP_IDS.length} groups...`)

  let totalCreated = 0
  let totalWithPosition = 0

  for (const [groupIndex, groupId] of GROUP_IDS.entries()) {
    const positionFlags = buildPositionFlags(DEVICES_PER_GROUP, POSITION_RATIO)
    const createdDeviceIds: string[] = []
    let createdInGroup = 0
    let positionedInGroup = 0

    for (let deviceIndex = 0; deviceIndex < DEVICES_PER_GROUP; deviceIndex += 1) {
      const withPosition = positionFlags[deviceIndex]
      const draft = buildDeviceDraft(groupId, groupIndex, deviceIndex, withPosition)
      const response = await client.inventory.create(draft)

      if (!response.data.id) {
        throw new Error(`Created device for group ${groupId} is missing an id.`)
      }

      createdDeviceIds.push(response.data.id)

      createdInGroup += 1
      totalCreated += 1

      if (withPosition) {
        positionedInGroup += 1
        totalWithPosition += 1
      }
    }

    for (const deviceIdChunk of chunkValues(createdDeviceIds, BULK_ADD_CHUNK_SIZE)) {
      await client.inventory.childAssetsBulkAdd(deviceIdChunk, groupId)
    }

    console.log(
      `Group ${groupId}: created ${createdInGroup} devices, ${positionedInGroup} with c8y_Position`,
    )
  }

  console.log(`Finished. Created ${totalCreated} devices total, ${totalWithPosition} with c8y_Position.`)
}

main().catch((error: unknown) => {
  console.error('Failed to create devices.')
  console.error(error)
  process.exitCode = 1
})
