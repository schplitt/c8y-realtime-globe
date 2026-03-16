# Realtime Globe Widget

A Cumulocity IoT dashboard widget that renders a 3D interactive globe and visualises incoming measurements in realtime.

## What it does

- Renders a 3D globe with hexagonal land polygons, atmosphere glow, and auto-rotation.
- Uses tenant CSS variables as the default color source and allows a few per-widget appearance overrides.
- Shows a live preview in the widget config using sample ripple events so appearance changes are visible immediately.
- Resolves the dashboard target at runtime and subscribes either to one device or to all descendants of a selected group or asset.
- Renders realtime ripple events only for managed objects that expose numeric `c8y_Position.lat` and `c8y_Position.lng` values.
- Shows a clipped top-left notification feed for each incoming measurement, including the device link, formatted coordinates, and all numeric fragment/series rows.
- Queues incoming realtime ripples before rendering them, with saved settings for debounce interval, queue size, and notification card timeout.

## Configuration

| Field                        | Description                                          |
| ---------------------------- | ---------------------------------------------------- |
| **Scene background color**   | Optional hex override for the renderer background    |
| **Globe surface color**      | Optional hex override for the globe material         |
| **Land polygon color**       | Optional hex override for land hexagons              |
| **Ripple color**             | Optional hex override for preview and event ripples  |
| **Auto-rotate / speed**      | Controls idle globe rotation                         |
| **Ripple max scale / speed** | Controls ripple animation behavior                   |
| **Measurement debounce**     | Playback interval between queued realtime events     |
| **Queue size**               | Maximum queued measurement events kept in memory     |
| **Card timeout**             | How long measurement notification cards stay visible |

If a color field is left empty, the widget falls back to tenant branding variables.

## Requirements

The dashboard target is selected by the built-in Cumulocity widget framework. The custom config component only handles globe appearance and preview, while the display component resolves hierarchy members and subscribes to realtime measurements at runtime.
