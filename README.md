# realtime-globe

A Cumulocity IoT dashboard widget that renders a 3D interactive globe and visualises incoming measurements in realtime. Each measurement fires an animated arc and ring at the device's geographic position. A live notification feed is shown in the top-left corner of the widget. All accent colours derive from the tenant's CSS custom property overrides (branding), with sensible dark-mode defaults.

## Features

- 3D interactive globe with hexagonal land polygons, atmosphere glow, and auto-rotation
- Realtime measurement subscriptions for a single device or all devices in a group (recursive)
- Animated arcs from a configurable origin point to each device's geographic position
- Pulse rings at device locations on each measurement
- Live notification feed (top-left corner) — device name links to the device dashboard, shows all measurement series, fades in/out with 200 ms CSS transitions, auto-dismisses after 4 s
- Burst debounce (300 ms) to coalesce rapid measurement buffers
- Fully themed via Cumulocity CSS custom properties with dark-mode defaults
- Dashboard context support — source resolves from the context dashboard automatically
- Realtime toggle button in the widget view (start/stop without entering edit mode)
- Dismissable info bar listing devices that have no `c8y_Position` and cannot be visualised

## Development

```sh
pnpm install   # Install dependencies
pnpm start     # Start dev server
pnpm build     # Build plugin
pnpm lint      # Lint with ESLint
```

## Repository

<https://github.com/schplitt/realtime-globe>
