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
import type { IManagedObject, IMeasurement } from '@c8y/client'
import { AlertService, MeasurementRealtimeService } from '@c8y/ngx-components'
import { EventGlobeRenderer } from '@event-globe/ts'
import type { EventGlobeRendererConfig } from '@event-globe/ts'
import type { Subscription } from 'rxjs'
import {
  DEFAULT_MEASUREMENT_DEBOUNCE_MS,
  DEFAULT_MEASUREMENT_QUEUE_SIZE,
  DEFAULT_NOTIFICATION_CARD_TIMEOUT_MS,
  GLOBE_WIDGET_APPEARANCE_DEFAULTS,
  normalizeHexColor,
} from '../globe-widget.model'
import type {
  GlobeWidgetAppearanceConfig,
  GlobeWidgetConfig,
  GlobeWidgetDeviceTarget,
  NotificationEntry,
} from '../globe-widget.model'
import { GlobeWidgetMeasurementEventsService } from './globe-widget-measurement-events.service'
import type { QueuedMeasurementPlaybackEvent } from './globe-widget-measurement-events.service'
import { MeasurementNotificationFeedComponent } from './measurement-notification-feed.component'
import { MissingPositionPopoverComponent } from './missing-position-popover.component'
import { GlobeWidgetSourcesService } from './globe-widget-sources.service'
import type { PositionedManagedObject } from './globe-widget-sources.service'

const NOTIFICATION_TRANSITION_MS = 300

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
    rippleColor: resolveCssVar('--c8y-brand-primary', GLOBE_WIDGET_APPEARANCE_DEFAULTS.rippleColor),
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
        <c8y-measurement-notification-feed [notifications]="notifications()" />
        <c8y-missing-position-popover [devices]="sourcesWithoutPosition()" />
      }
      <div #globeContainer style="width: 100%; height: 100%;"></div>
    </div>
  `,
  imports: [MeasurementNotificationFeedComponent, MissingPositionPopoverComponent],
  providers: [MeasurementRealtimeService],
})
export class GlobeWidgetComponent implements AfterViewInit, OnDestroy {
  private readonly destroyRef = inject(DestroyRef)
  private readonly measurementRealtime = inject(MeasurementRealtimeService)
  private readonly measurementEvents = inject(GlobeWidgetMeasurementEventsService)
  private readonly sourcesService = inject(GlobeWidgetSourcesService)
  private readonly alertService = inject(AlertService)
  private readonly globeContainer = viewChild.required<ElementRef<HTMLElement>>('globeContainer')

  private readonly renderer = signal<EventGlobeRenderer | null>(null)
  private previewRippleInterval: number | null = null
  private realtimeFlushTimeout: number | null = null
  private readonly sourcesWithPosition = signal<PositionedManagedObject[]>([])
  protected readonly sourcesWithoutPosition = signal<IManagedObject[]>([])
  protected readonly notifications = signal<NotificationEntry[]>([])
  private readonly pendingMeasurementEvents = signal<QueuedMeasurementPlaybackEvent[]>([])
  private readonly realtimeSubscriptions = new Map<string, Subscription>()
  private readonly notificationTimeouts = new Map<number, Array<() => void>>()
  private realtimeSubscriptionRenderer: EventGlobeRenderer | null = null
  private notificationIdSequence = 0
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

  private readonly measurementQueueSize = computed(
    () => Math.max(1, this.config().measurementQueueSize ?? DEFAULT_MEASUREMENT_QUEUE_SIZE),
  )

  private readonly measurementDebounceMs = computed(
    () => Math.max(0, this.config().measurementDebounceMs ?? DEFAULT_MEASUREMENT_DEBOUNCE_MS),
  )

  private readonly notificationCardTimeoutMs = computed(
    () => Math.max(0, this.config().notificationCardTimeoutMs ?? DEFAULT_NOTIFICATION_CARD_TIMEOUT_MS),
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
        this.clearNotifications()
        this.sourcesWithPosition.set([])
        this.sourcesWithoutPosition.set([])
        return
      }

      const target = this.config().device
      let cancelled = false

      this.clearNotifications()
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
      this.measurementQueueSize()
      this.measurementDebounceMs()
      this.notificationCardTimeoutMs()

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
      this.alertService.danger('Failed to load globe sources. Please check the configuration and try again.')
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
        .subscribe((measurement: IMeasurement) => {
          this.queueMeasurementEvent(this.measurementEvents.createPlaybackEvent(
            source,
            measurement,
            this.appearance().rippleColor,
            ++this.notificationIdSequence,
          ))
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

  private queueMeasurementEvent(event: QueuedMeasurementPlaybackEvent): void {
    const queueSize = this.measurementQueueSize()

    this.pendingMeasurementEvents.update((events) => {
      if (events.length >= queueSize) {
        return [...events.slice(-(queueSize - 1)), event]
      }

      return [...events, event]
    })

    this.scheduleQueuedRipplePlayback()
  }

  private scheduleQueuedRipplePlayback(): void {
    if (this.realtimeFlushTimeout !== null) {
      return
    }

    this.realtimeFlushTimeout = window.setTimeout(() => {
      this.realtimeFlushTimeout = null
      this.playNextQueuedRipple()
    }, this.measurementDebounceMs())
  }

  private playNextQueuedRipple(): void {
    const renderer = this.renderer()
    const events = this.pendingMeasurementEvents()

    if (!renderer || this.preview() || events.length === 0) {
      this.pendingMeasurementEvents.set([])
      return
    }

    const [nextEvent, ...remainingEvents] = events
    this.pendingMeasurementEvents.set(remainingEvents)
    renderer.addEvent('ripple', nextEvent.ripple)
    this.addNotification(nextEvent.notification)

    if (remainingEvents.length > 0) {
      this.scheduleQueuedRipplePlayback()
    }
  }

  private clearRealtimeState(): void {
    this.clearRealtimeSubscriptions()
    this.clearNotifications()
    this.pendingMeasurementEvents.set([])

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

  private addNotification(nextNotification: NotificationEntry): void {
    const notificationId = nextNotification.id
    const notificationLifetimeMs = this.notificationCardTimeoutMs()

    this.notifications.update((notifications) => [nextNotification, ...notifications])

    const cancels: Array<() => void> = []

    if (notificationLifetimeMs > 0) {
      // 2 to let angular first handle the signals and then let the CSS transition trigger after the element is in the DOM
      let rafHandle2 = 0
      const rafHandle1 = window.requestAnimationFrame(() => {
        rafHandle2 = window.requestAnimationFrame(() => {
          this.updateNotification(notificationId, { isVisible: true })
        })
      })
      cancels.push(() => {
        window.cancelAnimationFrame(rafHandle1)
        window.cancelAnimationFrame(rafHandle2)
      })
    }

    const dismissTimeout = window.setTimeout(() => {
      this.updateNotification(notificationId, { isLeaving: true, isVisible: false })
    }, notificationLifetimeMs)
    cancels.push(() => window.clearTimeout(dismissTimeout))

    const removeTimeout = window.setTimeout(() => {
      this.removeNotification(notificationId)
    }, notificationLifetimeMs + NOTIFICATION_TRANSITION_MS)
    cancels.push(() => window.clearTimeout(removeTimeout))

    this.notificationTimeouts.set(notificationId, cancels)
  }

  private updateNotification(
    notificationId: number,
    patch: Partial<Pick<NotificationEntry, 'isVisible' | 'isLeaving'>>,
  ): void {
    this.notifications.update((notifications) => notifications.map((notification) => {
      if (notification.id !== notificationId) {
        return notification
      }

      return {
        ...notification,
        ...patch,
      }
    }))
  }

  private removeNotification(notificationId: number): void {
    this.clearNotificationTimeouts(notificationId)
    this.notifications.update((notifications) => notifications.filter((notification) => notification.id !== notificationId))
  }

  private clearNotifications(): void {
    for (const notificationId of this.notificationTimeouts.keys()) {
      this.clearNotificationTimeouts(notificationId)
    }

    this.notifications.set([])
  }

  private clearNotificationTimeouts(notificationId: number): void {
    const cancels = this.notificationTimeouts.get(notificationId)

    if (!cancels) {
      return
    }

    for (const cancel of cancels) {
      cancel()
    }

    this.notificationTimeouts.delete(notificationId)
  }
}
