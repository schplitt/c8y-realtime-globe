import { Component, input } from '@angular/core'
import type { GlobeWidgetConfig } from '../globe-widget.model'

@Component({
  selector: 'c8y-globe-widget',
  template: `<div class="p-16">Globe widget placeholder</div>`,
  standalone: true,
})
export class GlobeWidgetComponent {
  readonly config = input<GlobeWidgetConfig>()
}
