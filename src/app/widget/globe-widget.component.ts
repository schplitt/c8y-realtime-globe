import type { AfterViewInit, ElementRef, OnDestroy } from '@angular/core'
import {
  Component,
  computed,
  effect,
  input,
  signal,
  viewChild,
} from '@angular/core'
import { EventGlobeRenderer } from '@event-globe/ts'
import type { EventGlobeRendererConfig } from '@event-globe/ts'
import { GLOBE_WIDGET_APPEARANCE_DEFAULTS, normalizeHexColor } from '../globe-widget.model'
import type { GlobeWidgetAppearanceConfig, GlobeWidgetConfig } from '../globe-widget.model'

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
      <div #globeContainer style="width: 100%; height: 100%;"></div>
    </div>
  `,
  standalone: true,
})
export class GlobeWidgetComponent implements AfterViewInit, OnDestroy {
  private readonly globeContainer = viewChild.required<ElementRef<HTMLElement>>('globeContainer')

  private readonly renderer = signal<EventGlobeRenderer | null>(null)
  private previewRippleInterval: number | null = null
  private readonly themeAppearance = signal<Required<GlobeWidgetAppearanceConfig>>(
    GLOBE_WIDGET_APPEARANCE_DEFAULTS,
  )

  readonly config = input.required<GlobeWidgetConfig>()
  readonly preview = input(false)
  protected readonly appearance = computed<Required<GlobeWidgetAppearanceConfig>>(() => ({
    ...this.themeAppearance(),
    ...this.config().appearance,
  }))

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
    this.renderer()?.destroy()
    this.renderer.set(null)
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
