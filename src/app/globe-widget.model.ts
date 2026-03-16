export type GlobeWidgetFragment = Record<string, never>

const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}){1,2}$/

export interface GlobeWidgetDeviceTarget {
  id: string
  name?: string
  c8y_IsDevice?: GlobeWidgetFragment
  c8y_IsDeviceGroup?: GlobeWidgetFragment
  c8y_IsDynamicGroup?: GlobeWidgetFragment
}

export interface GlobeWidgetAppearanceConfig {
  sceneBackgroundColor?: string
  globeColor?: string
  emissive?: string
  atmosphereColor?: string
  landPolygonColor?: string
  rippleColor?: string
  autoRotate?: boolean
  autoRotateSpeed?: number
  rippleMaxScale?: number
  rippleExpansionSpeed?: number
}

export interface MeasurementSeriesEntry {
  fragment: string
  series: string
  value: number
  unit?: string
}

export interface NotificationEntry {
  id: number
  deviceId: string
  deviceName: string
  lat: number
  lng: number
  series: MeasurementSeriesEntry[]
  isVisible: boolean
  isLeaving: boolean
}

export const GLOBE_WIDGET_APPEARANCE_DEFAULTS = {
  sceneBackgroundColor: '#212121',
  globeColor: '#303841',
  emissive: '#4C5967',
  atmosphereColor: '#4C5967',
  landPolygonColor: '#ffbe00',
  rippleColor: '#119d11',
  autoRotate: true,
  autoRotateSpeed: 0.3,
  rippleMaxScale: 3.5,
  rippleExpansionSpeed: 0.08,
} satisfies Required<GlobeWidgetAppearanceConfig>

export function normalizeHexColor(value: string | null | undefined): string | undefined {
  const trimmedValue = value?.trim()
  return trimmedValue && HEX_COLOR_PATTERN.test(trimmedValue) ? trimmedValue : undefined
}

export interface GlobeWidgetConfig {
  device?: GlobeWidgetDeviceTarget
  appearance?: GlobeWidgetAppearanceConfig
  measurementDebounceMs?: number
  measurementQueueSize?: number
  notificationCardTimeoutMs?: number
}

export const DEFAULT_MEASUREMENT_DEBOUNCE_MS = 50
export const DEFAULT_MEASUREMENT_QUEUE_SIZE = 100
export const DEFAULT_NOTIFICATION_CARD_TIMEOUT_MS = 10000
