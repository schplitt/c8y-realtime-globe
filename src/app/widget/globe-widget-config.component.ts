import { AsyncPipe } from '@angular/common'
import {
  Component,
  DestroyRef,
  inject,
  Input,
  ViewChild,
} from '@angular/core'
import type { AfterViewInit, OnDestroy, OnInit, TemplateRef } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { ControlContainer, FormControl, FormGroup, NgForm, ReactiveFormsModule } from '@angular/forms'
import { CommonModule } from '@c8y/ngx-components'
import { WidgetConfigService } from '@c8y/ngx-components/context-dashboard'
import { BehaviorSubject } from 'rxjs'
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
import { GlobeWidgetComponent } from './globe-widget.component'

type GlobeWidgetAppearanceForm = FormGroup<{
  sceneBackgroundColor: FormControl<string>
  globeColor: FormControl<string>
  emissive: FormControl<string>
  atmosphereColor: FormControl<string>
  landPolygonColor: FormControl<string>
  rippleColor: FormControl<string>
  autoRotate: FormControl<boolean>
  autoRotateSpeed: FormControl<number>
  rippleMaxScale: FormControl<number>
  rippleExpansionSpeed: FormControl<number>
  measurementDebounceMs: FormControl<number>
}>

function stripDefaultAppearanceValues(
  appearance: Required<GlobeWidgetAppearanceConfig>,
): GlobeWidgetAppearanceConfig | undefined {
  const overrides: GlobeWidgetAppearanceConfig = {}

  if (appearance.sceneBackgroundColor !== GLOBE_WIDGET_APPEARANCE_DEFAULTS.sceneBackgroundColor) {
    overrides.sceneBackgroundColor = appearance.sceneBackgroundColor
  }

  if (appearance.globeColor !== GLOBE_WIDGET_APPEARANCE_DEFAULTS.globeColor) {
    overrides.globeColor = appearance.globeColor
  }

  if (appearance.emissive !== GLOBE_WIDGET_APPEARANCE_DEFAULTS.emissive) {
    overrides.emissive = appearance.emissive
  }

  if (appearance.atmosphereColor !== GLOBE_WIDGET_APPEARANCE_DEFAULTS.atmosphereColor) {
    overrides.atmosphereColor = appearance.atmosphereColor
  }

  if (appearance.landPolygonColor !== GLOBE_WIDGET_APPEARANCE_DEFAULTS.landPolygonColor) {
    overrides.landPolygonColor = appearance.landPolygonColor
  }

  if (appearance.rippleColor !== GLOBE_WIDGET_APPEARANCE_DEFAULTS.rippleColor) {
    overrides.rippleColor = appearance.rippleColor
  }

  if (appearance.autoRotate !== GLOBE_WIDGET_APPEARANCE_DEFAULTS.autoRotate) {
    overrides.autoRotate = appearance.autoRotate
  }

  if (appearance.autoRotateSpeed !== GLOBE_WIDGET_APPEARANCE_DEFAULTS.autoRotateSpeed) {
    overrides.autoRotateSpeed = appearance.autoRotateSpeed
  }

  if (appearance.rippleMaxScale !== GLOBE_WIDGET_APPEARANCE_DEFAULTS.rippleMaxScale) {
    overrides.rippleMaxScale = appearance.rippleMaxScale
  }

  if (appearance.rippleExpansionSpeed !== GLOBE_WIDGET_APPEARANCE_DEFAULTS.rippleExpansionSpeed) {
    overrides.rippleExpansionSpeed = appearance.rippleExpansionSpeed
  }

  return Object.keys(overrides).length > 0 ? overrides : undefined
}

function createAppearanceForm(): GlobeWidgetAppearanceForm {
  return new FormGroup({
    sceneBackgroundColor: new FormControl<string>('', { nonNullable: true }),
    globeColor: new FormControl<string>('', { nonNullable: true }),
    emissive: new FormControl<string>('', { nonNullable: true }),
    atmosphereColor: new FormControl<string>('', { nonNullable: true }),
    landPolygonColor: new FormControl<string>('', { nonNullable: true }),
    rippleColor: new FormControl<string>('', { nonNullable: true }),
    autoRotate: new FormControl<boolean>(GLOBE_WIDGET_APPEARANCE_DEFAULTS.autoRotate, {
      nonNullable: true,
    }),
    autoRotateSpeed: new FormControl<number>(GLOBE_WIDGET_APPEARANCE_DEFAULTS.autoRotateSpeed, {
      nonNullable: true,
    }),
    rippleMaxScale: new FormControl<number>(GLOBE_WIDGET_APPEARANCE_DEFAULTS.rippleMaxScale, {
      nonNullable: true,
    }),
    rippleExpansionSpeed: new FormControl<number>(
      GLOBE_WIDGET_APPEARANCE_DEFAULTS.rippleExpansionSpeed,
      { nonNullable: true },
    ),
    measurementDebounceMs: new FormControl<number>(DEFAULT_MEASUREMENT_DEBOUNCE_MS, {
      nonNullable: true,
    }),
  })
}

@Component({
  selector: 'c8y-globe-widget-config',
  template: `
    <div class="d-flex d-col gap-16 p-16" [formGroup]="formGroup">
      <div class="d-flex d-col gap-4">
        <div class="text-medium">Preview-first setup</div>
        <p class="m-0 text-muted">
          The dashboard target comes from Cumulocity automatically. This config only exposes a few appearance overrides for the preview and saved widget.
        </p>
      </div>

      <div class="row">
        <div class="col-xs-12 col-md-6">
          <label class="d-flex d-col gap-4 text-medium">
            Scene background
            <input
              class="form-control"
              formControlName="sceneBackgroundColor"
              placeholder="Uses tenant default when empty"
              spellcheck="false"
            />
          </label>
        </div>
        <div class="col-xs-12 col-md-6">
          <label class="d-flex d-col gap-4 text-medium">
            Globe surface
            <input
              class="form-control"
              formControlName="globeColor"
              placeholder="Uses tenant default when empty"
              spellcheck="false"
            />
          </label>
        </div>
      </div>

      <div class="row">
        <div class="col-xs-12 col-md-6">
          <label class="d-flex d-col gap-4 text-medium">
            Land polygon color
            <input
              class="form-control"
              formControlName="landPolygonColor"
              placeholder="Uses tenant default when empty"
              spellcheck="false"
            />
          </label>
        </div>
        <div class="col-xs-12 col-md-6">
          <label class="d-flex d-col gap-4 text-medium">
            Ripple color
            <input
              class="form-control"
              formControlName="rippleColor"
              placeholder="Uses tenant default when empty"
              spellcheck="false"
            />
          </label>
        </div>
      </div>

      <div class="row">
        <div class="col-xs-12 col-md-4">
          <label class="d-flex d-col gap-4 text-medium">
            Auto-rotate speed
            <input class="form-control" formControlName="autoRotateSpeed" min="0" max="4" step="0.1" type="number" />
          </label>
        </div>
        <div class="col-xs-12 col-md-4">
          <label class="d-flex d-col gap-4 text-medium">
            Ripple max scale
            <input class="form-control" formControlName="rippleMaxScale" min="1" max="10" step="0.1" type="number" />
          </label>
        </div>
      </div>

      <div class="row">
        <div class="col-xs-12 col-md-4">
          <label class="d-flex d-col gap-4 text-medium">
            Ripple expansion speed
            <input
              class="form-control"
              formControlName="rippleExpansionSpeed"
              min="0.01"
              max="1"
              step="0.01"
              type="number"
            />
          </label>
        </div>
        <div class="col-xs-12 col-md-4">
          <label class="d-flex d-col gap-4 text-medium">
            Measurement debounce
            <input
              class="form-control"
              formControlName="measurementDebounceMs"
              min="0"
              max="5000"
              step="50"
              type="number"
            />
          </label>
        </div>
        <div class="col-xs-12 col-md-4 d-flex align-items-end">
          <label class="checkbox m-b-0">
            <input formControlName="autoRotate" type="checkbox" />
            <span></span>
            Auto-rotate globe
          </label>
        </div>
      </div>

      <p class="m-0 text-12 text-muted">
        Leave color fields empty to keep following the tenant theme. Use hex colors like #ffbe00 for explicit overrides.
      </p>
    </div>
    <ng-template #widgetPreview>
      <c8y-globe-widget [config]="(previewConfig$ | async) ?? fallbackPreviewConfig" [preview]="true" />
    </ng-template>
  `,
  standalone: true,
  imports: [AsyncPipe, CommonModule, GlobeWidgetComponent, ReactiveFormsModule],
  viewProviders: [{ provide: ControlContainer, useExisting: NgForm }],
})
export class GlobeWidgetConfigComponent implements AfterViewInit, OnDestroy, OnInit {
  private readonly destroyRef = inject(DestroyRef)
  private readonly form = inject(NgForm)
  private readonly widgetConfigService = inject(WidgetConfigService)

  private currentDevice: GlobeWidgetDeviceTarget | undefined

  @Input() config: GlobeWidgetConfig = {}

  @ViewChild('widgetPreview') private widgetPreview?: TemplateRef<unknown>

  protected readonly formGroup = createAppearanceForm()
  protected readonly previewConfig$ = new BehaviorSubject<GlobeWidgetConfig>({})
  protected readonly fallbackPreviewConfig: GlobeWidgetConfig = {}

  ngAfterViewInit(): void {
    if (this.widgetPreview) {
      this.widgetConfigService.setPreview(this.widgetPreview)
    }
  }

  ngOnInit(): void {
    this.form.form.setControl('widgetConfig', this.formGroup)
    this.patchForm(this.config.appearance)
    this.pushPreviewConfig()

    this.widgetConfigService.currentConfig$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((currentConfig) => {
        const widgetConfig = currentConfig?.config as GlobeWidgetConfig | undefined
        this.config = widgetConfig ?? this.config
        this.currentDevice = currentConfig?.device as GlobeWidgetDeviceTarget | undefined
        this.patchForm(this.config.appearance)
        this.pushPreviewConfig()
      })

    this.formGroup.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.pushPreviewConfig()
    })

    this.widgetConfigService.addOnBeforeSave((config) => {
      if (this.formGroup.invalid || !config) {
        return false
      }

      Object.assign(config, this.buildConfig())
      return true
    })
  }

  ngOnDestroy(): void {
    this.previewConfig$.complete()
    this.form.form.removeControl('widgetConfig')
  }

  private patchForm(appearance: GlobeWidgetAppearanceConfig | undefined): void {
    this.formGroup.patchValue(
      {
        sceneBackgroundColor: appearance?.sceneBackgroundColor ?? '',
        globeColor: appearance?.globeColor ?? '',
        emissive: appearance?.emissive ?? '',
        atmosphereColor: appearance?.atmosphereColor ?? '',
        landPolygonColor: appearance?.landPolygonColor ?? '',
        rippleColor: appearance?.rippleColor ?? '',
        autoRotate: appearance?.autoRotate ?? GLOBE_WIDGET_APPEARANCE_DEFAULTS.autoRotate,
        autoRotateSpeed:
          appearance?.autoRotateSpeed ?? GLOBE_WIDGET_APPEARANCE_DEFAULTS.autoRotateSpeed,
        rippleMaxScale:
          appearance?.rippleMaxScale ?? GLOBE_WIDGET_APPEARANCE_DEFAULTS.rippleMaxScale,
        rippleExpansionSpeed:
          appearance?.rippleExpansionSpeed ?? GLOBE_WIDGET_APPEARANCE_DEFAULTS.rippleExpansionSpeed,
        measurementDebounceMs: this.config.measurementDebounceMs ?? DEFAULT_MEASUREMENT_DEBOUNCE_MS,
      },
      { emitEvent: false },
    )
  }

  private pushPreviewConfig(): void {
    this.previewConfig$.next(this.buildConfig())
  }

  private buildConfig(): GlobeWidgetConfig {
    const appearance = this.buildAppearanceOverrides()
    const formValue = this.formGroup.getRawValue()

    return {
      ...this.config,
      device: this.currentDevice ?? this.config.device,
      measurementDebounceMs: formValue.measurementDebounceMs,
      ...(appearance ? { appearance } : {}),
    }
  }

  private buildAppearanceOverrides(): GlobeWidgetAppearanceConfig | undefined {
    const formValue = this.formGroup.getRawValue()

    return stripDefaultAppearanceValues({
      sceneBackgroundColor:
        normalizeHexColor(formValue.sceneBackgroundColor)
        ?? GLOBE_WIDGET_APPEARANCE_DEFAULTS.sceneBackgroundColor,
      globeColor: normalizeHexColor(formValue.globeColor) ?? GLOBE_WIDGET_APPEARANCE_DEFAULTS.globeColor,
      emissive: normalizeHexColor(formValue.emissive) ?? GLOBE_WIDGET_APPEARANCE_DEFAULTS.emissive,
      atmosphereColor:
        normalizeHexColor(formValue.atmosphereColor)
        ?? GLOBE_WIDGET_APPEARANCE_DEFAULTS.atmosphereColor,
      landPolygonColor:
        normalizeHexColor(formValue.landPolygonColor)
        ?? GLOBE_WIDGET_APPEARANCE_DEFAULTS.landPolygonColor,
      rippleColor:
        normalizeHexColor(formValue.rippleColor) ?? GLOBE_WIDGET_APPEARANCE_DEFAULTS.rippleColor,
      autoRotate: formValue.autoRotate,
      autoRotateSpeed: formValue.autoRotateSpeed,
      rippleMaxScale: formValue.rippleMaxScale,
      rippleExpansionSpeed: formValue.rippleExpansionSpeed,
    })
  }
}
