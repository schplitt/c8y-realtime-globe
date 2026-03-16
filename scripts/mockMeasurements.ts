/* eslint-disable no-console */
/* eslint-disable node/prefer-global/process */
import type { IManagedObject, IMeasurementCreate, QueryObjectRoot } from '@c8y/client'

import {
  assertConfig,
  createClient,
  DEFAULT_PROFILE,
  MAX_DELAY_MS,
  MIN_DELAY_MS,

  resolveBlueprint,
  ROOT_GROUP_ID,
} from './c8y-script.shared.js'
import type { MeasurementProfile } from './c8y-script.shared.js'

const DEVICE_QUERY_PAGE_SIZE = 2000

type DeviceCandidate = IManagedObject & {
  mockMeasurementProfile?: Partial<MeasurementProfile>
}

interface DeviceRuntimeProfile {
  id: string
  name: string
  type: string
  profile: MeasurementProfile
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function randomDelay(): number {
  return Math.floor(randomBetween(MIN_DELAY_MS, MAX_DELAY_MS + 1))
}

function randomItem<T>(values: readonly T[]): T {
  return values[Math.floor(Math.random() * values.length)]
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function toNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function resolveProfile(device: DeviceCandidate): MeasurementProfile {
  const customProfile = isRecord(device.mockMeasurementProfile)
    ? device.mockMeasurementProfile
    : undefined

  if (customProfile) {
    const fragment = typeof customProfile.fragment === 'string' ? customProfile.fragment : undefined
    const series = typeof customProfile.series === 'string' ? customProfile.series : undefined
    const unit = typeof customProfile.unit === 'string' ? customProfile.unit : undefined
    const measurementType = typeof customProfile.measurementType === 'string'
      ? customProfile.measurementType
      : undefined
    const start = toNumber(customProfile.start)
    const min = toNumber(customProfile.min)
    const max = toNumber(customProfile.max)
    const step = toNumber(customProfile.step)

    if (fragment && series && unit && measurementType && start !== undefined && min !== undefined && max !== undefined && step !== undefined) {
      return { fragment, series, unit, measurementType, start, min, max, step }
    }
  }

  const blueprint = resolveBlueprint(device.type)

  return blueprint?.measurementProfile ?? DEFAULT_PROFILE
}

function hasDeviceFragment(managedObject: Partial<IManagedObject>): managedObject is DeviceCandidate {
  return Boolean(managedObject.c8y_IsDevice)
}

async function collectDescendantDevices(
  client: Awaited<ReturnType<typeof createClient>>,
  rootId: string,
): Promise<DeviceRuntimeProfile[]> {
  const query: QueryObjectRoot = {
    __and: {
      __isinhierarchyof: rootId,
      __has: 'c8y_IsDevice',
    },
  }

  const response = await client.inventory.listQuery(query, {
    pageSize: DEVICE_QUERY_PAGE_SIZE,
  })

  return response.data
    .filter((managedObject) => managedObject.id && managedObject.id !== rootId)
    .filter(hasDeviceFragment)
    .map((managedObject) => ({
      id: managedObject.id,
      name: typeof managedObject.name === 'string' ? managedObject.name : managedObject.id,
      type: typeof managedObject.type === 'string' ? managedObject.type : 'mock_GenericAsset',
      profile: resolveProfile(managedObject),
    }))
}

function nextValue(lastValue: number | undefined, profile: MeasurementProfile): number {
  const previousValue = lastValue ?? profile.start
  const delta = randomBetween(-profile.step, profile.step)
  const value = clamp(previousValue + delta, profile.min, profile.max)

  return Number(value.toFixed(2))
}

async function sendMeasurement(
  client: Awaited<ReturnType<typeof createClient>>,
  device: DeviceRuntimeProfile,
  lastValues: Map<string, number>,
): Promise<number> {
  const value = nextValue(lastValues.get(device.id), device.profile)
  lastValues.set(device.id, value)

  const measurement: Partial<IMeasurementCreate> = {
    sourceId: device.id,
    type: device.profile.measurementType,
    time: new Date().toISOString(),
    [device.profile.fragment]: {
      [device.profile.series]: {
        value,
        unit: device.profile.unit,
      },
    },
  }

  await client.measurement.create(measurement)

  return value
}

async function main(): Promise<void> {
  assertConfig()

  const client = await createClient()
  const devices = await collectDescendantDevices(client, ROOT_GROUP_ID)

  if (devices.length === 0) {
    throw new Error(`No descendant devices found below ${ROOT_GROUP_ID}.`)
  }

  const lastValues = new Map<string, number>()
  let sentCount = 0

  console.log(`Loaded ${devices.length} descendant devices below ${ROOT_GROUP_ID}. Starting measurement loop...`)

  for (;;) {
    const device = randomItem(devices)
    const value = await sendMeasurement(client, device, lastValues)
    sentCount += 1

    if (sentCount === 1 || sentCount % 25 === 0) {
      console.log(
        `[${sentCount}] ${device.name} (${device.id}) -> ${device.profile.fragment}.${device.profile.series} = ${value} ${device.profile.unit}`,
      )
    }

    await delay(randomDelay())
  }
}

main().catch((error: unknown) => {
  console.error('Failed to generate mock measurements.')
  console.error(error)
  process.exitCode = 1
})
