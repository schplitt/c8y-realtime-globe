/* eslint-disable node/prefer-global/process */
import 'dotenv/config'
import { Client } from '@c8y/client'

const REQUIRED_ENV_VARS = {
  tenantId: 'C8Y_DEVELOPMENT_TENANT',
  user: 'C8Y_DEVELOPMENT_USER',
  password: 'C8Y_DEVELOPMENT_PASSWORD',
  baseUrl: 'C8Y_BASEURL',
} as const

export const C8Y_CONFIG = {
  tenantId: process.env[REQUIRED_ENV_VARS.tenantId] ?? '',
  user: process.env[REQUIRED_ENV_VARS.user] ?? '',
  password: process.env[REQUIRED_ENV_VARS.password] ?? '',
  baseUrl: process.env[REQUIRED_ENV_VARS.baseUrl] ?? '',
} as const

export const GROUP_IDS = ['1936711', '6337736', '2238683', '2735702'] as const
export const ROOT_GROUP_ID = GROUP_IDS[0]
export const DEVICES_PER_GROUP = 50
export const POSITION_RATIO = 0.7
export const PAGE_SIZE = 100
export const MIN_DELAY_MS = 500
export const MAX_DELAY_MS = 1000

export interface MeasurementProfile {
  fragment: string
  series: string
  unit: string
  measurementType: string
  start: number
  min: number
  max: number
  step: number
}

export interface DeviceBlueprint {
  label: string
  type: string
  measurementProfile: MeasurementProfile
}

export interface GeoCluster {
  lat: number
  lng: number
  latSpread: number
  lngSpread: number
}

export const DEVICE_BLUEPRINTS: readonly DeviceBlueprint[] = [
  {
    label: 'Silo',
    type: 'mock_SiloAsset',
    measurementProfile: {
      fragment: 'c8y_FillLevel',
      series: 'level',
      unit: '%',
      measurementType: 'mock_SiloLevel',
      start: 64,
      min: 5,
      max: 98,
      step: 3.2,
    },
  },
  {
    label: 'Machine',
    type: 'mock_MachineAsset',
    measurementProfile: {
      fragment: 'c8y_Vibration',
      series: 'rms',
      unit: 'mm/s',
      measurementType: 'mock_MachineVibration',
      start: 2.4,
      min: 0.2,
      max: 9.5,
      step: 0.65,
    },
  },
  {
    label: 'Warehouse',
    type: 'mock_WarehouseAsset',
    measurementProfile: {
      fragment: 'c8y_StorageLoad',
      series: 'occupancy',
      unit: '%',
      measurementType: 'mock_WarehouseLoad',
      start: 57,
      min: 10,
      max: 99,
      step: 4.8,
    },
  },
  {
    label: 'Pipeline',
    type: 'mock_PipelineAsset',
    measurementProfile: {
      fragment: 'c8y_Flow',
      series: 'flow',
      unit: 'm3/h',
      measurementType: 'mock_PipelineFlow',
      start: 128,
      min: 40,
      max: 240,
      step: 12,
    },
  },
  {
    label: 'Pump',
    type: 'mock_PumpAsset',
    measurementProfile: {
      fragment: 'c8y_Flow',
      series: 'volume',
      unit: 'l/min',
      measurementType: 'mock_PumpFlow',
      start: 420,
      min: 120,
      max: 900,
      step: 48,
    },
  },
  {
    label: 'Turbine',
    type: 'mock_TurbineAsset',
    measurementProfile: {
      fragment: 'c8y_RotationSpeed',
      series: 'rpm',
      unit: 'rpm',
      measurementType: 'mock_TurbineSpeed',
      start: 1460,
      min: 600,
      max: 3200,
      step: 90,
    },
  },
  {
    label: 'Boiler',
    type: 'mock_BoilerAsset',
    measurementProfile: {
      fragment: 'c8y_Temperature',
      series: 'temperature',
      unit: 'degC',
      measurementType: 'mock_BoilerTemperature',
      start: 86,
      min: 40,
      max: 140,
      step: 6,
    },
  },
  {
    label: 'Compressor',
    type: 'mock_CompressorAsset',
    measurementProfile: {
      fragment: 'c8y_Pressure',
      series: 'pressure',
      unit: 'bar',
      measurementType: 'mock_CompressorPressure',
      start: 7.4,
      min: 2,
      max: 12,
      step: 0.6,
    },
  },
  {
    label: 'Conveyor',
    type: 'mock_ConveyorAsset',
    measurementProfile: {
      fragment: 'c8y_Speed',
      series: 'beltSpeed',
      unit: 'm/s',
      measurementType: 'mock_ConveyorSpeed',
      start: 1.8,
      min: 0.4,
      max: 4.8,
      step: 0.35,
    },
  },
  {
    label: 'Chiller',
    type: 'mock_ChillerAsset',
    measurementProfile: {
      fragment: 'c8y_Temperature',
      series: 'returnTemp',
      unit: 'degC',
      measurementType: 'mock_ChillerTemperature',
      start: 7.5,
      min: -3,
      max: 18,
      step: 1.1,
    },
  },
] as const

export const DEFAULT_PROFILE: MeasurementProfile = {
  fragment: 'c8y_Temperature',
  series: 'value',
  unit: 'degC',
  measurementType: 'mock_GenericTemperature',
  start: 21,
  min: -10,
  max: 80,
  step: 2.3,
}

export const GROUP_CLUSTERS: Record<string, GeoCluster> = {
  1936711: { lat: 48.1, lng: 11.6, latSpread: 4, lngSpread: 6 },
  6337736: { lat: 52.0, lng: 4.3, latSpread: 4, lngSpread: 6 },
  2238683: { lat: 45.5, lng: 9.2, latSpread: 4, lngSpread: 6 },
  2735702: { lat: 50.1, lng: 14.4, latSpread: 4, lngSpread: 6 },
}

export function assertConfig(): void {
  const missing = Object.entries(REQUIRED_ENV_VARS)
    .filter(([configKey]) => C8Y_CONFIG[configKey as keyof typeof C8Y_CONFIG].trim().length === 0)
    .map(([, envVarName]) => envVarName)

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}

export async function createClient(): Promise<Client> {
  return Client.authenticate({
    tenant: C8Y_CONFIG.tenantId,
    user: C8Y_CONFIG.user,
    password: C8Y_CONFIG.password,
  }, C8Y_CONFIG.baseUrl)
}

export function resolveBlueprint(type: string | undefined): DeviceBlueprint | undefined {
  return DEVICE_BLUEPRINTS.find((blueprint) => blueprint.type === type)
}
