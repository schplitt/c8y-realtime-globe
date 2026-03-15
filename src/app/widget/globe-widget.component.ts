import type { AfterViewInit, ElementRef, OnDestroy } from '@angular/core'
import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import type { IManagedObject } from '@c8y/client'
import { MeasurementRealtimeService } from '@c8y/ngx-components'
import { EventGlobeRenderer } from '@event-globe/ts'
import type { EventGlobeRendererConfig } from '@event-globe/ts'
import type { Subscription } from 'rxjs'
import {
  DEFAULT_MEASUREMENT_DEBOUNCE_MS,
  GLOBE_WIDGET_APPEARANCE_DEFAULTS,
  normalizeHexColor,
} from '../globe-widget.model'
import type {
  GlobeWidgetAppearanceConfig,
  GlobeWidgetConfig,
  GlobeWidgetDeviceTarget,
} from '../globe-widget.model'
import { MissingPositionPopoverComponent } from './missing-position-popover.component'
import { GlobeWidgetSourcesService } from './globe-widget-sources.service'
import type { PositionedManagedObject } from './globe-widget-sources.service'

interface QueuedRippleEvent {
  lat: number
  lng: number
  color: string
}

function resolveCssVar(varName: string, fallback: string): string {
  const resolvedValue = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
  return resolvedValue || fallback
}

function toHexNumber(color: string, fallback: string): number {
  const normalizedColor = normalizeHexColor(color) ?? normalizeHexColor(fallback) ?? '#000000'
  return Number.parseInt(normalizedColor.slice(1), 16)
}

function resolveThemeAppearance(): Required<GlobeWidgetAppearanceConfig> {
  return {
    ...GLOBE_WIDGET_APPEARANCE_DEFAULTS,
    sceneBackgroundColor: resolveCssVar(
      '--c8y-palette-gray-10',
      GLOBE_WIDGET_APPEARANCE_DEFAULTS.sceneBackgroundColor,
    ),
    globeColor: resolveCssVar('--c8y-palette-gray-30', GLOBE_WIDGET_APPEARANCE_DEFAULTS.globeColor),
    emissive: resolveCssVar('--c8y-palette-gray-20', GLOBE_WIDGET_APPEARANCE_DEFAULTS.emissive),
    atmosphereColor: resolveCssVar(
      '--c8y-palette-gray-20',
      GLOBE_WIDGET_APPEARANCE_DEFAULTS.atmosphereColor,
    ),
    landPolygonColor: resolveCssVar(
      '--c8y-palette-yellow-60',
      GLOBE_WIDGET_APPEARANCE_DEFAULTS.landPolygonColor,
    ),
    rippleColor: resolveCssVar('--c8y-palette-yellow-60', GLOBE_WIDGET_APPEARANCE_DEFAULTS.rippleColor),
  }
}

function createRendererConfig(
  appearance: Required<GlobeWidgetAppearanceConfig>,
): EventGlobeRendererConfig {
  return {
    autoRotate: appearance.autoRotate,
    autoRotateSpeed: appearance.autoRotateSpeed,
    manualRotate: true,
    sceneBackgroundColor: toHexNumber(
      appearance.sceneBackgroundColor,
      GLOBE_WIDGET_APPEARANCE_DEFAULTS.sceneBackgroundColor,
    ),
    globe: {
      globeColor: appearance.globeColor,
      emissive: appearance.emissive,
      emissiveIntensity: 0.35,
      shininess: 0,
      showLandPolygons: true,
      landPolygonColor: appearance.landPolygonColor as `#${number}`,
      hexUseDots: false,
      showAtmosphere: true,
      atmosphereColor: appearance.atmosphereColor,
      defaultArcColor: appearance.rippleColor,
      defaultRippleColor: appearance.rippleColor,
      rippleMaxScale: appearance.rippleMaxScale,
      rippleExpansionSpeed: appearance.rippleExpansionSpeed,
    },
  }
}

@Component({
  selector: 'c8y-globe-widget',
  template: `
    <div class="p-relative overflow-hidden" style="width: 100%; height: 100%;">
      @if (preview()) {
        <div
          class="p-absolute d-flex align-items-center gap-8 p-8 p-l-12 p-r-12 text-12 text-medium"
          style="top: 16px; left: 16px; z-index: 1; border-radius: 999px; background: rgba(33, 33, 33, 0.78); color: #f0f2f4; pointer-events: none;"
        >
          Preview
        </div>
      }
      @if (!preview()) {
        <c8y-missing-position-popover [devices]="sourcesWithoutPosition()" />
      }
      <div #globeContainer style="width: 100%; height: 100%;"></div>
    </div>
  `,
  standalone: true,
  imports: [MissingPositionPopoverComponent],
  providers: [MeasurementRealtimeService],
})
export class GlobeWidgetComponent implements AfterViewInit, OnDestroy {
  private readonly destroyRef = inject(DestroyRef)
  private readonly measurementRealtime = inject(MeasurementRealtimeService)
  private readonly sourcesService = inject(GlobeWidgetSourcesService)
  private readonly globeContainer = viewChild.required<ElementRef<HTMLElement>>('globeContainer')

  private readonly renderer = signal<EventGlobeRenderer | null>(null)
  private previewRippleInterval: number | null = null
  private realtimeFlushTimeout: number | null = null
  private readonly sourcesWithPosition = signal<PositionedManagedObject[]>([])
  protected readonly sourcesWithoutPosition = signal<IManagedObject[]>([])
  private readonly pendingRippleEvents = signal<QueuedRippleEvent[]>([])
  private readonly realtimeSubscriptions = new Map<string, Subscription>()
  private realtimeSubscriptionRenderer: EventGlobeRenderer | null = null
  private readonly themeAppearance = signal<Required<GlobeWidgetAppearanceConfig>>(
    GLOBE_WIDGET_APPEARANCE_DEFAULTS,
  )

  private readonly positionedSourcesById = computed(
    () => new Map(this.sourcesWithPosition().map((source) => [source.id, source] as const)),
  )

  readonly config = input.required<GlobeWidgetConfig>()
  readonly preview = input(false)
  protected readonly appearance = computed<Required<GlobeWidgetAppearanceConfig>>(() => ({
    ...this.themeAppearance(),
    ...this.config().appearance,
  }))

  private readonly measurementDebounceMs = computed(
    () => Math.max(0, this.config().measurementDebounceMs ?? DEFAULT_MEASUREMENT_DEBOUNCE_MS),
  )

  constructor() {
    this.themeAppearance.set(resolveThemeAppearance())

    effect(() => {
      const renderer = this.renderer()
      if (!renderer) {
        return
      }

      renderer.updateConfig(createRendererConfig(this.appearance()))
    })

    effect(() => {
      const renderer = this.renderer()
      if (!renderer) {
        return
      }

      if (this.preview()) {
        this.startPreviewRipples(renderer)
        return
      }

      this.stopPreviewRipples()
      renderer.removeAllEvents()
    })

    effect((onCleanup) => {
      if (this.preview()) {
        this.clearRealtimeSubscriptions()
        this.sourcesWithPosition.set([])
        this.sourcesWithoutPosition.set([])
        return
      }

      const target = this.config().device
      let cancelled = false

      this.sourcesWithPosition.set([])
      this.sourcesWithoutPosition.set([])

      onCleanup(() => {
        cancelled = true
      })

      this.loadRealtimeSources(target, () => cancelled).catch(() => undefined)
    })

    effect(() => {
      const renderer = this.renderer()
      const sourcesById = this.positionedSourcesById()
      this.measurementDebounceMs()

      if (!renderer || this.preview()) {
        this.clearRealtimeState()
        return
      }

      this.syncRealtimeSubscriptions(renderer, sourcesById)
    })
  }

  ngAfterViewInit(): void {
    const renderer = new EventGlobeRenderer(
      this.globeContainer().nativeElement,
      createRendererConfig(this.appearance()),
    )

    this.renderer.set(renderer)
  }

  ngOnDestroy(): void {
    this.stopPreviewRipples()
    this.clearRealtimeState()
    this.renderer()?.destroy()
    this.renderer.set(null)
  }

  private async loadRealtimeSources(
    target: GlobeWidgetDeviceTarget | undefined,
    isCancelled: () => boolean,
  ): Promise<void> {
    if (!target) {
      return
    }

    try {
      const resolvedSources = await this.sourcesService.resolveSources(target)

      if (isCancelled()) {
        return
      }

      this.sourcesWithPosition.set(resolvedSources.withPosition)
      this.sourcesWithoutPosition.set(resolvedSources.withoutPosition)
    } catch (error) {
      if (!isCancelled()) {
        this.sourcesWithPosition.set([])
        this.sourcesWithoutPosition.set([])
      }

      console.error('Failed to resolve realtime globe sources.', error)
    }
  }

  private syncRealtimeSubscriptions(
    renderer: EventGlobeRenderer,
    sourcesById: ReadonlyMap<string, PositionedManagedObject>,
  ): void {
    if (this.realtimeSubscriptionRenderer && this.realtimeSubscriptionRenderer !== renderer) {
      this.clearRealtimeSubscriptions()
    }

    this.realtimeSubscriptionRenderer = renderer

    for (const [sourceId, subscription] of this.realtimeSubscriptions) {
      if (sourcesById.has(sourceId)) {
        continue
      }

      subscription.unsubscribe()
      this.realtimeSubscriptions.delete(sourceId)
    }

    if (sourcesById.size === 0) {
      this.clearRealtimeSubscriptions()
      return
    }

    if (this.realtimeSubscriptions.size === 0) {
      renderer.removeAllEvents()
      this.measurementRealtime.start()
    }

    for (const [sourceId, source] of sourcesById) {
      if (this.realtimeSubscriptions.has(sourceId)) {
        continue
      }

      const subscription = this.measurementRealtime
        .onCreate$(sourceId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          this.queueRippleEvent({
            lat: source.c8y_Position.lat,
            lng: source.c8y_Position.lng,
            color: this.appearance().rippleColor,
          })
        })

      this.realtimeSubscriptions.set(sourceId, subscription)
    }
  }

  private clearRealtimeSubscriptions(): void {
    for (const subscription of this.realtimeSubscriptions.values()) {
      subscription.unsubscribe()
    }

    this.realtimeSubscriptions.clear()
    this.realtimeSubscriptionRenderer = null
    this.measurementRealtime.stop()
  }

  private queueRippleEvent(event: QueuedRippleEvent): void {
    this.pendingRippleEvents.update((events) => [...events, event])
    this.scheduleRippleFlush()
  }

  private scheduleRippleFlush(): void {
    if (this.realtimeFlushTimeout !== null) {
      window.clearTimeout(this.realtimeFlushTimeout)
    }

    this.realtimeFlushTimeout = window.setTimeout(() => {
      this.realtimeFlushTimeout = null
      this.flushQueuedRippleEvents()
    }, this.measurementDebounceMs())
  }

  private flushQueuedRippleEvents(): void {
    const renderer = this.renderer()
    const events = this.pendingRippleEvents()

    if (!renderer || this.preview() || events.length === 0) {
      this.pendingRippleEvents.set([])
      return
    }

    this.pendingRippleEvents.set([])

    for (const event of events) {
      renderer.addEvent('ripple', event)
    }
  }

  private clearRealtimeState(): void {
    this.clearRealtimeSubscriptions()
    this.pendingRippleEvents.set([])

    if (this.realtimeFlushTimeout !== null) {
      window.clearTimeout(this.realtimeFlushTimeout)
      this.realtimeFlushTimeout = null
    }
  }

  private startPreviewRipples(renderer: EventGlobeRenderer): void {
    if (this.previewRippleInterval !== null) {
      return
    }

    this.emitPreviewRipple(renderer)
    this.previewRippleInterval = window.setInterval(() => {
      this.emitPreviewRipple(renderer)
    }, 100)
  }

  private stopPreviewRipples(): void {
    if (this.previewRippleInterval !== null) {
      window.clearInterval(this.previewRippleInterval)
      this.previewRippleInterval = null
    }
  }

  private emitPreviewRipple(renderer: EventGlobeRenderer): void {
    renderer.addEvent('ripple', {
      lat: (Math.random() * 180) - 90,
      lng: (Math.random() * 360) - 180,
      color: this.appearance().rippleColor,
    })
  }
}
