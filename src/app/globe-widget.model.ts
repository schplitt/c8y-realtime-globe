export type GlobeWidgetFragment = Record<string, never>

export interface GlobeWidgetDeviceTarget {
  id: string
  name: string
  c8y_IsDevice?: GlobeWidgetFragment
  c8y_IsDeviceGroup?: GlobeWidgetFragment
  c8y_IsDynamicGroup?: GlobeWidgetFragment
}

export interface GlobeWidgetConfig {
  device?: GlobeWidgetDeviceTarget
}
