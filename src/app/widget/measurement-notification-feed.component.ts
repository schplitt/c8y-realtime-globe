import { Component, input } from '@angular/core'
import { IconDirective } from '@c8y/ngx-components'
import type { MeasurementSeriesEntry, NotificationEntry } from '../globe-widget.model'

const COORDINATE_FORMATTER = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 3,
})

const MEASUREMENT_VALUE_FORMATTER = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 3,
})

@Component({
  selector: 'c8y-measurement-notification-feed',
  template: `
    <div
      class="p-absolute d-flex d-col overflow-hidden"
      style="top: 16px; left: 16px; z-index: 2; width: min(360px, calc(100% - 32px)); max-height: calc(100% - 32px); pointer-events: none;"
    >
      @for (notification of notifications(); track notification.id) {
        <article
          class="d-grid"
          style="transition: grid-template-rows 200ms ease-in-out, opacity 200ms ease-in-out, transform 200ms ease-in-out, margin-bottom 200ms ease-in-out;"
          [style.grid-template-rows]="notification.isVisible && !notification.isLeaving ? '1fr' : '0fr'"
          [style.opacity]="notification.isVisible && !notification.isLeaving ? '1' : '0'"
          [style.transform]="notification.isVisible && !notification.isLeaving ? 'translateY(0) scale(1)' : 'translateY(-12px) scale(0.98)'"
          [style.marginBottom]="notification.isVisible && !notification.isLeaving ? '12px' : '0'"
        >
          <div class="overflow-hidden" style="pointer-events: auto;">
            <div
              class="d-flex d-col gap-8 p-16"
              style="border-radius: 18px; border: 1px solid color-mix(in srgb, var(--c8y-palette-yellow-60, #ffbe00) 38%, var(--c8y-palette-gray-30, #4C5967)); background: linear-gradient(140deg, color-mix(in srgb, var(--c8y-palette-yellow-60, #ffbe00) 18%, transparent) 0%, transparent 45%), linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0)) , var(--c8y-palette-gray-20, #303841); box-shadow: inset 4px 0 0 var(--c8y-palette-yellow-60, #ffbe00), 0 18px 30px rgba(0, 0, 0, 0.2); color: var(--c8y-palette-gray-90, #F0F2F4); backdrop-filter: blur(6px);"
            >
              <div class="d-flex align-items-start gap-16">
                <span
                  class="flex-no-shrink"
                  style="display: flex; align-items: center; justify-content: center; width: 32px; min-width: 32px; height: 32px; min-height: 32px; border-radius: 12px; background: var(--c8y-palette-yellow-60, #ffbe00); color: var(--c8y-palette-gray-10, #212121); box-shadow: 0 0 0 1px color-mix(in srgb, var(--c8y-palette-yellow-60, #ffbe00) 60%, transparent);"
                >
                  <i c8yIcon="bell" style="display: block; font-size: 14px; line-height: 1; color: inherit;"></i>
                </span>
                <div class="d-flex d-col gap-4 min-width-0 flex-grow">
                  <a
                    class="text-14 text-medium text-truncate"
                    [href]="deviceDashboardUrl(notification.deviceId)"
                    target="_blank"
                    rel="noreferrer noopener"
                    [title]="notification.deviceName"
                    style="color: var(--c8y-palette-yellow-60, #ffbe00); text-decoration: none;"
                  >
                    {{ notification.deviceName }}
                  </a>
                  <div class="text-11" style="color: color-mix(in srgb, var(--c8y-palette-gray-90, #F0F2F4) 76%, var(--c8y-palette-yellow-60, #ffbe00) 24%);">
                    {{ formatPosition(notification.lat, notification.lng) }}
                  </div>
                </div>
              </div>

              @if (notification.series.length > 0) {
                <table class="fit-w" style="border-collapse: separate; border-spacing: 0; table-layout: fixed; background: color-mix(in srgb, var(--c8y-palette-gray-10, #212121) 24%, transparent); border: 1px solid color-mix(in srgb, var(--c8y-palette-yellow-60, #ffbe00) 22%, var(--c8y-palette-gray-30, #4C5967)); border-radius: 14px; overflow: hidden;">
                  <thead>
                    <tr class="text-10 text-uppercase">
                      <th style="padding: 8px 10px; text-align: left; color: var(--c8y-palette-gray-80, #d2d7db); font-weight: 600; background: color-mix(in srgb, var(--c8y-palette-yellow-60, #ffbe00) 16%, var(--c8y-palette-gray-10, #212121)); border-bottom: 1px solid color-mix(in srgb, var(--c8y-palette-yellow-60, #ffbe00) 22%, var(--c8y-palette-gray-30, #4C5967));">Fragment</th>
                      <th style="padding: 8px 10px; text-align: left; color: var(--c8y-palette-gray-80, #d2d7db); font-weight: 600; background: color-mix(in srgb, var(--c8y-palette-yellow-60, #ffbe00) 16%, var(--c8y-palette-gray-10, #212121)); border-bottom: 1px solid color-mix(in srgb, var(--c8y-palette-yellow-60, #ffbe00) 22%, var(--c8y-palette-gray-30, #4C5967));">Series</th>
                      <th style="padding: 8px 10px; text-align: right; color: var(--c8y-palette-gray-80, #d2d7db); font-weight: 600; background: color-mix(in srgb, var(--c8y-palette-yellow-60, #ffbe00) 16%, var(--c8y-palette-gray-10, #212121)); border-bottom: 1px solid color-mix(in srgb, var(--c8y-palette-yellow-60, #ffbe00) 22%, var(--c8y-palette-gray-30, #4C5967));">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (seriesEntry of notification.series; track seriesEntry.fragment + '-' + seriesEntry.series) {
                      <tr>
                        <td class="p-r-8" style="padding: 8px 10px; border-top: 1px solid color-mix(in srgb, var(--c8y-palette-gray-30, #4C5967) 60%, transparent); vertical-align: top; background: color-mix(in srgb, var(--c8y-palette-gray-20, #303841) 82%, transparent);">
                          <span
                            class="d-inline-flex text-10 text-medium max-width-100"
                            style="padding: 2px 6px; border-radius: 10px; background: color-mix(in srgb, var(--c8y-palette-yellow-60, #ffbe00) 22%, transparent); color: var(--c8y-palette-yellow-60, #ffbe00); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--c8y-palette-yellow-60, #ffbe00) 28%, transparent); white-space: normal; word-break: break-word; overflow-wrap: anywhere;"
                          >
                            {{ seriesEntry.fragment }}
                          </span>
                        </td>
                        <td class="text-11 p-r-8" style="padding: 8px 10px; border-top: 1px solid color-mix(in srgb, var(--c8y-palette-gray-30, #4C5967) 60%, transparent); vertical-align: top; background: color-mix(in srgb, var(--c8y-palette-gray-20, #303841) 82%, transparent);">
                          <span
                            class="d-inline-flex text-11"
                            style="padding: 2px 0; color: color-mix(in srgb, var(--c8y-palette-gray-90, #F0F2F4) 82%, var(--c8y-brand-primary, #119d11) 18%); font-weight: 500; word-break: break-word; overflow-wrap: anywhere;"
                          >
                            {{ seriesEntry.series }}
                          </span>
                        </td>
                        <td class="text-11 text-right" style="padding: 8px 10px; border-top: 1px solid color-mix(in srgb, var(--c8y-palette-gray-30, #4C5967) 60%, transparent); color: var(--c8y-palette-yellow-60, #ffbe00); vertical-align: top; white-space: nowrap; background: color-mix(in srgb, var(--c8y-palette-gray-10, #212121) 18%, var(--c8y-palette-gray-20, #303841)); font-weight: 700; text-shadow: 0 1px 0 rgba(0, 0, 0, 0.2);">
                          {{ formatMeasurementValue(seriesEntry) }}
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              } @else {
                <div
                  class="text-11"
                  style="padding-top: 4px; color: color-mix(in srgb, var(--c8y-palette-gray-90, #F0F2F4) 74%, var(--c8y-palette-yellow-60, #ffbe00) 26%); border-top: 1px solid color-mix(in srgb, var(--c8y-palette-yellow-60, #ffbe00) 16%, var(--c8y-palette-gray-30, #4C5967));"
                >
                  No numeric fragment series found in this measurement.
                </div>
              }
            </div>
          </div>
        </article>
      }
    </div>
  `,
  imports: [IconDirective],
})
export class MeasurementNotificationFeedComponent {
  readonly notifications = input.required<NotificationEntry[]>()

  protected deviceDashboardUrl(deviceId: string): string {
    return `/apps/cockpit/index.html#/device/${encodeURIComponent(deviceId)}`
  }

  protected formatPosition(lat: number, lng: number): string {
    return `${COORDINATE_FORMATTER.format(lat)}°, ${COORDINATE_FORMATTER.format(lng)}°`
  }

  protected formatMeasurementValue(seriesEntry: MeasurementSeriesEntry): string {
    const value = MEASUREMENT_VALUE_FORMATTER.format(seriesEntry.value)
    return seriesEntry.unit ? `${value} ${seriesEntry.unit}` : value
  }
}
