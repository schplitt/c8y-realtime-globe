import { Component, computed, input } from '@angular/core'
import type { IManagedObject } from '@c8y/client'
import { IconDirective } from '@c8y/ngx-components'
import { PopoverModule } from 'ngx-bootstrap/popover'

@Component({
  selector: 'c8y-missing-position-popover',
  template: `
    @if (count() > 0) {
      <div class="p-absolute" style="top: 16px; right: 16px; z-index: 2;">
        <button
          class="btn btn-default btn-sm d-flex align-items-center gap-8"
          [popover]="missingPositionPopover"
          popoverTitle="Devices without position"
          placement="left"
          container="body"
          containerClass="overflow-hidden"
          [adaptivePosition]="false"
          [outsideClick]="true"
          triggers="click"
          style="min-height: 36px; padding: 6px 8px 6px 6px; border-radius: 999px; background: rgba(33, 33, 33, 0.86); color: #f0f2f4; border-color: rgba(76, 89, 103, 0.92);"
          type="button"
          aria-label="Show devices without position"
        >
          <span
            class="flex-no-shrink"
            style="display: flex; align-items: center; justify-content: center; width: 22px; min-width: 22px; height: 22px; min-height: 22px; border-radius: 50%; background: #ffbe00; color: #212121;"
          >
            <i c8yIcon="exclamation-circle" style="display: block; font-size: 12px; line-height: 1; color: inherit;"></i>
          </span>
          <span class="text-12">Missing position</span>
          <span
            class="badge"
            style="background: #ffbe00; color: #212121; min-width: 22px; border-radius: 999px;"
          >
            {{ count() }}
          </span>
        </button>
      </div>

      <ng-template #missingPositionPopover>
        <div
          style="display: block; width: 280px; max-width: calc(100vw - 32px); max-height: 220px; overflow: hidden;"
        >
          <div style="box-sizing: border-box; width: 100%; max-height: 220px; overflow-y: scroll; overflow-x: hidden; scrollbar-gutter: stable; padding: 8px 12px 8px 8px;">
            <div class="d-flex d-col gap-4">
              @for (device of sortedDevices(); track device.id) {
                <a
                  class="text-12"
                  [href]="deviceDashboardUrl(device.id)"
                  target="_blank"
                  rel="noreferrer noopener"
                  [title]="deviceLabel(device)"
                  style="display: block; max-width: 100%; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; color: inherit;"
                >
                  {{ deviceLabel(device) }}
                </a>
              }
            </div>
          </div>
        </div>
      </ng-template>
    }
  `,
  imports: [IconDirective, PopoverModule],
})
export class MissingPositionPopoverComponent {
  readonly devices = input<IManagedObject[]>([])

  protected readonly count = computed(() => this.devices().length)
  protected readonly sortedDevices = computed(() => [...this.devices()]
    .sort((left, right) => this.deviceLabel(left).localeCompare(this.deviceLabel(right))))

  protected deviceDashboardUrl(deviceId: string): string {
    return `/apps/cockpit/index.html#/device/${encodeURIComponent(deviceId)}`
  }

  protected deviceLabel(device: IManagedObject): string {
    const name = typeof device['name'] === 'string' ? device['name'].trim() : ''
    return name || device.id
  }
}
