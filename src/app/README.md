# Realtime Globe Widget

A Cumulocity IoT dashboard widget that renders a 3D interactive globe and visualises incoming measurements in realtime.

## What it does

- Renders a 3D globe with hexagonal land polygons, atmosphere glow, and auto-rotation.
- Uses tenant CSS variables as the default color source and allows a few per-widget appearance overrides.
- Shows a live preview in the widget config using sample ripple events so appearance changes are visible immediately.

## Configuration

| Field                        | Description                                         |
| ---------------------------- | --------------------------------------------------- |
| **Scene background color**   | Optional hex override for the renderer background   |
| **Globe surface color**      | Optional hex override for the globe material        |
| **Land polygon color**       | Optional hex override for land hexagons             |
| **Ripple color**             | Optional hex override for preview and event ripples |
| **Auto-rotate / speed**      | Controls idle globe rotation                        |
| **Ripple max scale / speed** | Controls ripple animation behavior                  |

If a color field is left empty, the widget falls back to tenant branding variables.

## Requirements

The dashboard target is still selected by the built-in Cumulocity widget framework. The custom config component only handles globe appearance and preview.
