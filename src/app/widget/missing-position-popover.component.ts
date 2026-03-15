import { Component, computed, input, signal } from '@angular/core'
import type { IManagedObject } from '@c8y/client'

@Component({
  selector: 'c8y-missing-position-popover',
  template: `
    @if (count() > 0) {
      <div
        class="p-absolute"
        style="top: 16px; right: 16px; z-index: 2;"
        (mouseenter)="setOpen(true)"
        (mouseleave)="setOpen(false)"
      >
        <button
          class="btn btn-default btn-sm d-flex align-items-center gap-8"
          style="min-height: 36px; padding: 6px 8px 6px 6px; border-radius: 999px; background: rgba(33, 33, 33, 0.86); color: #f0f2f4; border-color: rgba(76, 89, 103, 0.92);"
          type="button"
          aria-label="Show devices without position"
        >
          <span
            class="d-inline-flex align-items-center justify-content-center text-medium"
            style="width: 22px; height: 22px; border-radius: 50%; background: #ffbe00; color: #212121; font-size: 12px; line-height: 1;"
          >
            !
          </span>
          <span class="text-12">Missing position</span>
          <span
            class="badge"
            style="background: #ffbe00; color: #212121; min-width: 22px; border-radius: 999px;"
          >
            {{ count() }}
          </span>
        </button>

        @if (isOpen()) {
          <div
            class="p-absolute p-8"
            style="top: 44px; right: 0; width: min(300px, calc(100vw - 32px)); max-height: 220px; overflow-y: auto; border-radius: 12px; background: rgba(33, 33, 33, 0.94); border: 1px solid rgba(76, 89, 103, 0.92); box-shadow: 0 12px 30px rgba(0, 0, 0, 0.28);"
          >
            <div class="text-12 text-medium m-b-8" style="color: #f0f2f4;">
              Devices without position
            </div>
            <div class="d-flex d-col gap-4">
              @for (device of sortedDevices(); track device.id) {
                <a
                  class="text-12"
                  [href]="deviceDashboardUrl(device.id)"
                  target="_blank"
                  rel="noreferrer noopener"
                  [title]="deviceLabel(device)"
                  style="display: block; max-width: 100%; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; color: #f0f2f4;"
                >
                  {{ deviceLabel(device) }}
                </a>
              }
            </div>
          </div>
        }
      </div>
    }
  `,
  standalone: true,
})
export class MissingPositionPopoverComponent {
  readonly devices = input<IManagedObject[]>([])

  protected readonly isOpen = signal(false)
  protected readonly count = computed(() => this.devices().length)
  protected readonly sortedDevices = computed(() => [...this.devices()]
    .sort((left, right) => this.deviceLabel(left).localeCompare(this.deviceLabel(right))))

  protected setOpen(isOpen: boolean): void {
    this.isOpen.set(isOpen)
  }

  protected deviceDashboardUrl(deviceId: string): string {
    return `/apps/cockpit/index.html#/device/${encodeURIComponent(deviceId)}`
  }

  protected deviceLabel(device: IManagedObject): string {
    const name = typeof device['name'] === 'string' ? device['name'].trim() : ''
    return name || device.id
  }
}
