# realtime-globe

A Cumulocity IoT dashboard widget for rendering an interactive 3D globe with tenant-themed defaults. The widget now resolves the dashboard target at runtime and can subscribe either to a single device or to all descendants of a selected group or asset.

## Current capabilities

- Renderer-backed standalone globe view using `@event-globe/ts`
- Preview mode that emits sample ripple events so the config preview is immediately visible
- Runtime target resolution that treats `config.device` as either a single device or a hierarchy root
- Batched inventory loading that separates positioned and non-positioned managed objects using `c8y_Position`
- Realtime measurement subscriptions for all resolved managed objects with a valid location so incoming measurements render globe ripples
- Top-left notification cards for incoming measurements with device links, formatted coordinates, and all detected fragment/series values
- Queued realtime ripple rendering with a configurable playback interval that defaults to `50 ms`
- Appearance overrides stored in widget config while keeping tenant CSS variables as the default source of truth
- Built-in dashboard target selection left to the Cumulocity framework instead of duplicating a custom source picker

## Configurable appearance

The widget config currently exposes a small set of appearance controls:

- Scene background color
- Globe surface color
- Land polygon color
- Ripple color
- Auto-rotate toggle and speed
- Ripple max scale and expansion speed
- Measurement debounce in milliseconds

Leaving a color field empty keeps the runtime tenant branding defaults:

- `--c8y-palette-gray-10` for the scene background
- `--c8y-palette-gray-30` for the globe surface
- `--c8y-palette-gray-20` for emissive and atmosphere glow
- `--c8y-palette-yellow-60` for land polygons
- `--c8y-brand-primary` for ripple events, with a green fallback

## Runtime target handling

- If the dashboard target is a device, only that managed object is loaded and subscribed.
- If the dashboard target is a group or asset, the widget queries all descendants in the hierarchy, reloads their full managed objects in batches, and subscribes only those with numeric `c8y_Position.lat` and `c8y_Position.lng` values.
- Managed objects without `c8y_Position` are kept separate from the realtime subscription set and ignored for ripple rendering.

## Development

```sh
pnpm install   # Install dependencies
pnpm start     # Start dev server
pnpm build     # Build plugin
pnpm lint      # Lint with ESLint
```

## Repository

<https://github.com/schplitt/realtime-globe>
