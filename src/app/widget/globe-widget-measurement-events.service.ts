import { Injectable } from '@angular/core'
import type { IManagedObject, IMeasurement } from '@c8y/client'
import type { NotificationEntry, MeasurementSeriesEntry } from '../globe-widget.model'
import type { PositionedManagedObject } from './globe-widget-sources.service'

export interface QueuedRippleEvent {
  lat: number
  lng: number
  color: string
}

export interface QueuedMeasurementPlaybackEvent {
  ripple: QueuedRippleEvent
  notification: NotificationEntry
}

const MEASUREMENT_FIELDS_TO_SKIP = new Set(['id', 'self', 'source', 'time', 'type'])

@Injectable({ providedIn: 'root' })
export class GlobeWidgetMeasurementEventsService {
  createPlaybackEvent(
    source: PositionedManagedObject,
    measurement: IMeasurement,
    rippleColor: string,
    notificationId: number,
  ): QueuedMeasurementPlaybackEvent {
    return {
      ripple: {
        lat: source.c8y_Position.lat,
        lng: source.c8y_Position.lng,
        color: rippleColor,
      },
      notification: {
        id: notificationId,
        deviceId: source.id,
        deviceName: this.deviceLabel(source),
        lat: source.c8y_Position.lat,
        lng: source.c8y_Position.lng,
        series: this.extractMeasurementSeriesEntries(measurement),
        isVisible: false,
        isLeaving: false,
      },
    }
  }

  private extractMeasurementSeriesEntries(measurement: IMeasurement): MeasurementSeriesEntry[] {
    const seriesEntries: MeasurementSeriesEntry[] = []

    for (const [fragment, fragmentValue] of Object.entries(measurement)) {
      if (MEASUREMENT_FIELDS_TO_SKIP.has(fragment)) {
        continue
      }

      if (!fragmentValue || typeof fragmentValue !== 'object' || Array.isArray(fragmentValue)) {
        continue
      }

      for (const [series, seriesValue] of Object.entries(fragmentValue as Record<string, unknown>)) {
        if (!seriesValue || typeof seriesValue !== 'object' || Array.isArray(seriesValue)) {
          continue
        }

        const numericValue = (seriesValue as { value?: unknown }).value

        if (typeof numericValue !== 'number' || !Number.isFinite(numericValue)) {
          continue
        }

        const unitValue = (seriesValue as { unit?: unknown }).unit

        seriesEntries.push({
          fragment,
          series,
          value: numericValue,
          unit: typeof unitValue === 'string' ? unitValue.trim() : undefined,
        })
      }
    }

    return seriesEntries
  }

  private deviceLabel(device: IManagedObject): string {
    const name = typeof device['name'] === 'string' ? device['name'].trim() : undefined
    return name || String(device.id)
  }
}
