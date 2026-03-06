# Realtime Globe Widget

A Cumulocity IoT dashboard widget that renders a 3D interactive globe and visualises incoming measurements in realtime.

## What it does

- Renders a 3D globe with hexagonal land polygons, atmosphere glow, and auto-rotation.
- Subscribes to realtime measurements for a configured **device** or all devices in a **group**.
- Fires an animated arc and pulse ring on the globe at the device's geographic position (`c8y_Position`) for each incoming measurement.
- Shows a live notification feed (top-left corner) with device name, measurement fragment/series, value, unit, and timestamp.
- Themed automatically via Cumulocity CSS custom properties — works with any tenant branding.

## Configuration

| Field                     | Description                                                                                                           |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Use dashboard context** | When enabled (default), the source is taken from the context dashboard automatically. Picker is hidden.               |
| **Source**                | A single device or group whose measurements are visualised. Only shown when dashboard context is disabled.            |
| **Arc origin (lat/lng)**  | The starting point of each animated arc. Auto-populated from the source asset's position; can be overridden manually. |

All measurement types from subscribed devices are visualised — there are no fragment or series filters.

## Requirements

Devices must have a `c8y_Position` fragment with numeric `lat` and `lng` fields to appear on the globe. Devices without a position are listed in a dismissable info bar inside the widget and are not silently ignored.
