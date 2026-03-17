import type { DynamicWidgetDefinition } from '@c8y/ngx-components'
import { hookWidget } from '@c8y/ngx-components'
import { gettext } from '@c8y/ngx-components/gettext'
import { GlobeWidgetConfigComponent } from './widget/globe-widget-config.component'
import { GlobeWidgetComponent } from './widget/globe-widget.component'
import { realtimeGlobePreviewImage } from '../assets/assets'

const globeWidgetDefinition = {
  id: 'realtime-globe',
  label: gettext('Realtime Globe'),
  description: gettext('A 3D interactive globe that visualizes incoming measurements in realtime.'),
  component: GlobeWidgetComponent,
  configComponent: GlobeWidgetConfigComponent,
  previewImage: realtimeGlobePreviewImage,
} satisfies DynamicWidgetDefinition

export const realtimeGlobeWidgetProviders = [hookWidget(globeWidgetDefinition)]
