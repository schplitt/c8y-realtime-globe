# realtime-globe

A Cumulocity IoT dashboard widget for rendering an interactive 3D globe with tenant-themed defaults. The current milestone focuses on a minimal globe renderer plus a preview-first widget config for appearance tuning.

## Current capabilities

- Renderer-backed standalone globe view using `@event-globe/ts`
- Preview mode that emits sample ripple events so the config preview is immediately visible
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

Leaving a color field empty keeps the runtime tenant branding defaults:

- `--c8y-palette-gray-10` for the scene background
- `--c8y-palette-gray-30` for the globe surface
- `--c8y-palette-gray-20` for emissive and atmosphere glow
- `--c8y-palette-yellow-60` for land polygons and ripple events

## Development

```sh
pnpm install   # Install dependencies
pnpm start     # Start dev server
pnpm build     # Build plugin
pnpm lint      # Lint with ESLint
```

## Repository

<https://github.com/schplitt/realtime-globe>
