import { Component, Input } from '@angular/core'
import type { DynamicComponent } from '@c8y/ngx-components'
import type { GlobeWidgetConfig } from '../globe-widget.model'

@Component({
  selector: 'c8y-globe-widget-config',
  template: `<div class="p-16">Globe widget config placeholder</div>`,
  standalone: true,
})
export class GlobeWidgetConfigComponent implements DynamicComponent {
  @Input() config: GlobeWidgetConfig = {}
  // TODO: implement config UI (AC-33)
}
