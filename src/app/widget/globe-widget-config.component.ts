import { AsyncPipe } from '@angular/common'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { Component, DestroyRef, Input, ViewChild, inject } from '@angular/core'
import type { TemplateRef } from '@angular/core'
import { WidgetConfigService } from '@c8y/ngx-components/context-dashboard'
import type { DynamicComponent } from '@c8y/ngx-components'
import { BehaviorSubject } from 'rxjs'
import type { GlobeWidgetConfig, GlobeWidgetDeviceTarget } from '../globe-widget.model'
import { GlobeWidgetComponent } from './globe-widget.component'

@Component({
  selector: 'c8y-globe-widget-config',
  template: `
    <div class="d-flex d-col gap-16 p-16">
      <div class="card card-default m-b-0">
        <div class="card-header separator">
          <h4 class="card-title m-b-0">Target</h4>
        </div>
        <div class="card-block p-16 d-flex d-col gap-12">
          <p class="text-muted m-b-0">
            Target selection is provided by the dashboard widget configuration outside this custom form.
          </p>

          <p class="text-muted m-b-0">
            This widget uses the injected device or group target and reacts to config updates while the editor is open.
          </p>

          @if (selectedDeviceSummary) {
            <div class="alert alert-info m-b-0 p-8">
              Selected {{ selectedDeviceSummary }}
            </div>
          } @else {
            <div class="alert alert-warning m-b-0 p-8">
              No target selected yet.
            </div>
          }
        </div>
      </div>
    </div>

    <ng-template #widgetPreview>
      <c8y-globe-widget [config]="config$ | async" />
    </ng-template>
  `,
  standalone: true,
  imports: [AsyncPipe, GlobeWidgetComponent],
})
export class GlobeWidgetConfigComponent implements DynamicComponent {
  @Input() config: GlobeWidgetConfig = null!

  private readonly destroyRef = inject(DestroyRef)
  private readonly widgetConfigService = inject(WidgetConfigService)

  protected readonly config$ = new BehaviorSubject<GlobeWidgetConfig>({})

  @ViewChild('widgetPreview', { static: true }) protected widgetPreview?: TemplateRef<unknown>

  protected selectedDeviceSummary = ''

  ngOnInit(): void {
    const initialConfig = this.sanitizeConfig(this.config)
    this.config$.next(initialConfig)
    this.selectedDeviceSummary = this.getDeviceSummary(initialConfig.device)

    this.widgetConfigService.currentConfig$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((config) => {
        const nextConfig = this.sanitizeConfig(config as GlobeWidgetConfig)
        this.config$.next(nextConfig)
        this.selectedDeviceSummary = this.getDeviceSummary(nextConfig.device)
      })

    this.widgetConfigService.addOnBeforeSave((config) => {
      Object.assign(config, this.sanitizeConfig(config as GlobeWidgetConfig))
      return true
    })

    this.widgetConfigService.setPreview(this.widgetPreview ?? null)
  }

  private getDeviceLabel(device: GlobeWidgetDeviceTarget): string {
    if (device.c8y_IsDevice) {
      return 'device'
    }

    return 'group'
  }

  private getDeviceSummary(device: GlobeWidgetDeviceTarget | undefined): string {
    if (!device) {
      return ''
    }

    return `${this.getDeviceLabel(device)} ${device.name} (${device.id})`
  }

  private sanitizeConfig(config: GlobeWidgetConfig | null | undefined): GlobeWidgetConfig {
    return {
      device: config?.device,
    }
  }
}
