# Realtime Globe Widget — Acceptance Criteria

**Package:** `@event-globe/ts` (already installed) + `@c8y/ngx-components`\
**Status:** Planning

---

## 1. Overview

A Cumulocity dashboard widget that renders a 3D interactive globe and visualises
incoming measurements in realtime. Each measurement fires an animated arc + ring
at the device's geographic position. A live notification feed is shown in the
top-left corner. All accent colours derive from the tenant's CSS custom property
overrides (branding), with sensible dark-mode defaults baked in.

---

## 2. Acceptance Criteria

### 2.1 Widget Registration & Lifecycle

- [ ] **AC-01** Widget is registered via `hookWidget` with a stable ID
      (`realtime-globe`) and a human-readable label/description.
- [ ] **AC-02** Widget view component is implemented as a standalone Angular
      component using **signals** throughout (no `ngOnInit`, no RxJS `Subject` for
      internal state where a signal suffices).
- [ ] **AC-03** Widget config component is implemented as a standalone Angular
      component using **signals** throughout.
- [ ] **AC-04** `EventGlobeRenderer` is created inside `afterNextRender` (or
      `ngAfterViewInit` with `inject(PLATFORM_ID)` guard), using a `ViewChild`
      `ElementRef` as the container.
- [ ] **AC-05** `EventGlobeRenderer` is destroyed (`renderer.destroy()`) in the
      component's `ngOnDestroy` / `DestroyRef.onDestroy` — no memory leaks.

---

### 2.2 Context / Source Selection

- [ ] **AC-06** The **config** has a `source` field that holds either:
     - a single **device** (picked via `c8y-asset-selector` or equivalent), or
     - a single **group** (same picker, type filter set to group).
- [ ] **AC-07** When the source is a **device**, realtime measurements are
      subscribed for that device's ID only.
- [ ] **AC-08** When the source is a **group**, all **direct and recursive child
      devices** are fetched via `InventoryService` (using
      `childAssets` / `withChildren` paging) and realtime subscriptions are opened
      for each device that has a valid `c8y_Position`.
- [ ] **AC-09** The config has a boolean `useDashboardContext` flag. When
      `true`, the widget reads the device or group from the **context dashboard
      framework** at runtime (via the injected context object) and ignores any
      stored `source`. This is the default when the widget is first added to a
      device/group context dashboard.
- [ ] **AC-10** When the widget config changes (different source selected, or
      `useDashboardContext` toggled), all existing subscriptions are torn down
      and new ones are started.

---

### 2.3 Geo-Position Requirement

- [ ] **AC-11** A device is only visualised on the globe if its managed object
      contains a `c8y_Position` fragment with numeric `lat` and `lng` fields.
- [ ] **AC-12** Devices without `c8y_Position` are tracked in a
      `WritableSignal<IManagedObject[]>` and surfaced in the widget UI as a
      dismissable info bar: _"X device(s) have no position and cannot be
      visualised"_, with an expandable list of device names/IDs. No error is
      thrown; no arc is rendered for these devices.
- [ ] **AC-13** Device position is read once at subscription setup from
      `InventoryService.detail(id)`. No live position tracking in this version.

---

### 2.4 Realtime Measurement Handling

- [ ] **AC-14** Uses `MeasurementRealtimeService` (provided at component level)
      to subscribe to each device.
- [ ] **AC-15** Subscriptions are started/stopped cleanly using
      `takeUntilDestroyed(destroyRef)`.
- [ ] **AC-16** Incoming messages are pushed into an internal **queue signal**
      (or a small `WritableSignal<MeasurementEvent[]>`).
- [ ] **AC-17** The queue is **drained with a debounce of 300 ms** — after 300 ms
      of silence the accumulated batch is processed together, so burst-released
      realtime buffers are coalesced.
- [ ] **AC-18** Each processed measurement fires:
     1. `renderer.addArc(...)` — arc originates from the **configured arc origin
        point** (see AC-39/AC-40) and ends at the device's `lat`/`lng`.
        Arc colour = hexagon colour (`--c8y-palette-yellow-60`).
     2. A notification entry added to the **notification queue signal**.

---

### 2.5 Notification Feed (Top-Left Toasts)

- [ ] **AC-19** A notification overlay is absolutely positioned in the
      **top-left corner** of the widget container (not the page).
- [ ] **AC-20** Each notification card shows:
     - **Device name** — rendered as a link that navigates to the device's
       dashboard (e.g. `/apps/cockpit/index.html#/device/<id>`)
     - **All measurement series** for that message: each series displayed as
       `<seriesName>: <value> <unit>` (one line per series)
- [ ] **AC-21** There is no hard cap on simultaneously visible cards. Each
      measurement creates exactly one card. New cards appear **at the top**,
      smoothly pushing any existing cards downward. Cards naturally disappear
      within 4 seconds, so the practical visible count is bounded by the
      incoming message rate.
- [ ] **AC-22** Each notification card auto-dismisses after **4 seconds**.
- [ ] **AC-23** Entry animation: card **fades in** at the top while existing
      cards translate downward (CSS `transform + transition`, not Angular
      `@trigger`). Exit animation: card **fades out** in place. Both transitions
      use `200 ms ease-in-out`.
- [ ] **AC-24** The burst debounce from AC-17 means at most one batch per 300 ms
      is surfaced, preventing card-spam during buffer flushes.

---

### 2.6 Colour Scheme (Theming)

All colours are read at runtime using `getComputedStyle(document.documentElement)`
so that tenant branding overrides take effect automatically.

| Role                   | CSS Variable              | Hardcoded Default |
| ---------------------- | ------------------------- | ----------------- |
| Scene background       | `--c8y-palette-gray-10`   | `#212121`         |
| Hexagon (land polygon) | `--c8y-palette-yellow-60` | `#ffbe00`         |
| Globe surface          | `--c8y-palette-gray-30`   | `#4C5967`         |
| Globe emissive         | `--c8y-palette-gray-20`   | `#303841`         |
| Atmosphere             | `--c8y-palette-gray-20`   | `#303841`         |
| Arc / ring default     | `--c8y-palette-yellow-60` | `#ffbe00`         |
| Notification card bg   | `--c8y-palette-gray-20`   | `#303841`         |
| Notification text      | `--c8y-palette-gray-90`   | `#F0F2F4`         |
| Notification border    | `--c8y-palette-gray-30`   | `#4C5967`         |

> **Scene fog is disabled** (`sceneFogNear` / `sceneFogFar` not set). A future
> option could tint the fog with the secondary brand colour
> (`--c8y-palette-green-40: #119d11`), but this is out of scope for v1.

- [ ] **AC-25** A `GlobeThemeService` (or a pure `computed()` helper function)
      resolves each colour by first checking `getComputedStyle` and falling back to
      the hardcoded defaults above.
- [ ] **AC-26** Colours are resolved once when the component initialises and
      passed to `EventGlobeRendererConfig`. No live CSS-variable polling (keeps
      renderer stable).
- [ ] **AC-27** The `sceneBackgroundColor` and globe colours in
      `EventGlobeRendererConfig` are hex **numbers** (e.g. `0x212121`) as required
      by Three.js; hex **strings** are used for all `GlobeConfig` fields.

---

### 2.7 Globe Visual Requirements

- [ ] **AC-28** Globe surface colour ≈ mid-gray (`--c8y-palette-gray-30`) so
      land hexagons are clearly visible against it.
- [ ] **AC-29** Land polygons are rendered as hexagons (`showLandPolygons: true`,
      `hexUseDots: false`) in the hexagon/yellow colour.
- [ ] **AC-30** Atmosphere glow is enabled (`showAtmosphere: true`) using the
      emissive gray colour.
- [ ] **AC-31** Auto-rotation is enabled by default; manual orbit is also
      enabled.
- [ ] **AC-32** Arcs use `showEndRing: true` (pulse at device location) and
      `flyingSegment: true` for a clean animated sweep.

---

### 2.8 Widget Config UI

- [ ] **AC-33** Config component exposes:
     - **Source** — `c8y-asset-selector` single-select picker (devices and groups).
       A "Use dashboard context" toggle sits above it; when active the picker is
       hidden and the source resolves from the context dashboard at runtime.
     - **Arc origin** — lat/lng input pair (degrees). Prepopulated automatically
       when a source with a `c8y_Position` is selected (see AC-39). User can
       override manually.
- [ ] **AC-34** Config is stored as a serialisable `GlobeWidgetConfig` interface
      in the widget's config object (no live objects / class instances stored).
- [ ] **AC-35** Config component provides a live preview area (uses
      `SamplePluginComponent` pattern or a simple `<c8y-realtime-globe>` preview).

> There are **no measurement fragment/series filters** in the config. Subscriptions
> are scoped purely by device ID; all measurement types from subscribed devices
> are visualised.

### 2.11 Live / Realtime Toggle

- [ ] **AC-43** The **widget view** (not the config) renders a
      `<c8y-realtime-btn [service]="measurementRealtime">` button so the user can
      start/stop the live subscription directly from the dashboard without entering
      edit mode.
- [ ] **AC-44** The realtime service is started **automatically on component
      init** (subscriptions open immediately); the button reflects the current
      active/paused state and toggles it.
- [ ] **AC-45** When realtime is paused, incoming measurements are **not**
      queued or buffered — they are simply ignored until the user resumes. No
      backlog accumulates.

---

### 2.9 Performance & Limits

- [ ] **AC-36** Maximum simultaneous active arcs on the globe: **50**. If more
      arrive, the oldest arc is removed before adding the new one (FIFO ring buffer
      on arc IDs tracked in a signal).
- [ ] **AC-37** Maximum device subscriptions: **200**. If a group contains more
      than 200 devices with position, a warning notification is shown in the UI and
      only the first 200 are subscribed.
- [ ] **AC-38** Device inventory page size for child fetching: **100** (paged
      with `promises` / `rxjs` chain, not `while(true)`).

### 2.10 Arc Origin

- [ ] **AC-39** When the user selects a **source** in the config, the widget
      attempts to read that asset's / group's own `c8y_Position` from the
      inventory. If found, `arcOrigin` in the config is auto-populated with that
      `lat`/`lng` and the label is set to the asset name.
- [ ] **AC-40** If no `c8y_Position` exists on the source asset (or the user
      selects a standalone device), `arcOrigin` defaults to `{ lat: 0, lng: 0 }`
      and the user can manually adjust it in the config.
- [ ] **AC-41** The arc origin lat/lng are editable number inputs in the config UI
      with validation (lat: −90…90, lng: −180…180).
- [ ] **AC-42** `arcOrigin` is stored in `GlobeWidgetConfig` as plain numbers;
      the displayed label (asset name) is derived at runtime, never stored.

> **TBD:** For complex multi-site hierarchies the "smart" origin (parent asset
> position) may need further UX design. For v1, auto-populate from source asset
> position + manual override covers the core use case.

---

## 3. Data Model

```ts
interface GlobeWidgetConfig {
  useDashboardContext?: boolean // default true
  source?: {
    id: string
    name: string
    type: 'device' | 'group'
  }
  arcOrigin?: {
    lat: number // -90 to 90, default 0
    lng: number // -180 to 180, default 0
  }
}

interface MeasurementSeries {
  series: string
  value: number
  unit: string
}

interface NotificationEntry {
  id: number
  deviceId: string // used to build the link to the device dashboard
  deviceName: string
  fragment: string
  series: MeasurementSeries[] // all series from the measurement message
  timestamp: Date
}
```

---

## 4. Technical Notes

### Realtime subscription pattern

```ts
// Per-device subscription (component providers array)
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
providers: [MeasurementRealtimeService]

// In component
const realtime = inject(MeasurementRealtimeService)
realtime.onAll$(deviceId).pipe(
  takeUntilDestroyed(destroyRef),
  debounceTime(300),
).subscribe((batch) => processEvents(batch))
```

> Note: `onAll$` emits per message, debounce is applied in the pipe.

### Colour resolution

```ts
function resolveCssVar(varName: string, fallback: string): string {
  const val = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
.trim()
  return val || fallback
}
```

### Arc ID ring buffer (signals)

```ts
const arcIds = signal<number[]>([])
const MAX_ARCS = 50

function addArcBounded(options: ArcOptions) {
  const ids = arcIds()
  if (ids.length >= MAX_ARCS) {
    renderer.removeArcById(ids[0])
    arcIds.update((list) => list.slice(1))
  }
  const id = renderer.addArc(options)
  arcIds.update((list) => [...list, id])
}
```

---

## 5. Implementation Phases

| Phase  | Scope                                                                                          | Status        |
| ------ | ---------------------------------------------------------------------------------------------- | ------------- |
| **P1** | Widget skeleton (hookWidget, empty globe, colour theming, no fog)                              | ☐ not started |
| **P2** | Config component: source picker + dashboard-context toggle + arc origin (auto + manual)        | ☐ not started |
| **P3** | Inventory service: resolve devices + positions; no-position info panel                         | ☐ not started |
| **P4** | Realtime subscriptions + arc rendering (origin → device lat/lng) + `c8y-realtime-btn` in view  | ☐ not started |
| **P5** | Notification feed (queue, 300 ms debounce, push-down animation, device link, auto-dismiss 4 s) | ☐ not started |
| **P6** | Arc ring buffer + subscription cap (AC-36, AC-37)                                              | ☐ not started |
| **P7** | Polish, cleanup, tests, docs update                                                            | ☐ not started |

---

## 6. Resolved Decisions

| #   | Question                      | Decision                                                                                                                                                                                                                                       |
| --- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Arc origin point**          | Configurable lat/lng in widget config. Auto-populated from source asset's `c8y_Position` if available; falls back to `[0, 0]`. User can always override manually. Multi-site UX TBD beyond v1.                                                 |
| 2   | **Measurement filter**        | **No filter.** Subscriptions are scoped by device ID only; all measurement types from subscribed devices are shown.                                                                                                                            |
| 3   | **Devices without position**  | Tracked in a signal; surfaced as a dismissable info bar inside the widget with count + expandable device list. Not silently ignored.                                                                                                           |
| 4   | **Fog**                       | **Disabled** in v1. Secondary brand green (`--c8y-palette-green-40: #119d11`) is noted as a future fog-tint option.                                                                                                                            |
| 5   | **Notification scope**        | `position: absolute` inside the widget container only — no CDK overlay, no page-level side effects.                                                                                                                                            |
| 6   | **Notification card content** | Device name (as link to device dashboard) + all series from the measurement (`seriesName: value unit`). No separate timestamp line shown.                                                                                                      |
| 7   | **Notification card stack**   | New card fades in at top, pushes others down. No hard cap — 4 s auto-dismiss bounds visible count naturally. CSS transitions only (no Angular `@trigger`).                                                                                     |
| 8   | **Dashboard context**         | Widget has a `useDashboardContext` flag (default `true`). When on a device/group context dashboard the source is taken from the framework context; picker is hidden. User can override by toggling off and selecting an explicit device/group. |
| 9   | **Realtime button**           | `c8y-realtime-btn` rendered in the **widget view** (not config). Service starts automatically on init. Pausing stops processing; no backlog is queued while paused.                                                                            |
