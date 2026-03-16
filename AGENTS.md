# AGENTS.md

## Project Overview

**realtime-globe** is a Cumulocity IoT dashboard widget that renders a 3D interactive globe and visualises incoming measurements in realtime. The initial milestone renders an animated ripple at the emitting device's geographic position. A live notification feed is shown in the top-left corner. All accent colours derive from the tenant's CSS custom property overrides, with sensible dark-mode defaults.

**Repository:** <https://github.com/schplitt/realtime-globe>

**Acceptance Criteria:** All feature requirements, data models, implementation phases, and resolved design decisions are documented in [`ACCEPTANCE_CRITERIA.md`](./ACCEPTANCE_CRITERIA.md). Read it before implementing any feature.

## Architecture

```
scripts/
  c8y-script.shared.ts               # Shared Cumulocity credentials, mock device profiles, and script constants
  createDevices.ts                   # Standalone @c8y/client seeding script for mock child devices
  cleanupSeededDevices.ts            # Removes seeded mock devices created by the helper scripts
  mockMeasurements.ts                # Standalone @c8y/client measurement generator for hierarchy descendants
src/
  app/
    widget/
      globe-widget.component.ts      # Globe widget view + renderer lifecycle and realtime orchestration
      globe-widget-config.component.ts  # Preview-first config UI for appearance overrides
      globe-widget-measurement-events.service.ts # Builds queued ripple+notification playback events from realtime measurements
      globe-widget-sources.service.ts   # Runtime target resolution, inventory paging, and position filtering
      measurement-notification-feed.component.ts # Top-left animated measurement cards with device links and series rows
      missing-position-popover.component.ts # Floating overlay listing devices missing c8y_Position
    app.config.ts                    # App + providers
    app.ts / app.html                # Shell app
    globe-widget.model.ts            # GlobeWidgetConfig and appearance config defaults
    index.ts                         # Exported providers (hookWidget)
    README.md                        # In-platform readme shown in plugin manager
  assets/
  bootstrap.ts / main.ts
cumulocity.config.ts                 # Plugin metadata, exports, federation
```

## Development

```sh
pnpm install    # Install dependencies
pnpm start      # Start dev server (ng serve)
pnpm build      # Build plugin (ng build)
pnpm lint       # Lint with ESLint
pnpm lint:fix   # Lint and auto-fix
```

## Code Style

- ESM only (`"type": "module"`)
- Angular 20 standalone components with **signals** throughout
- Uses `@schplitt/eslint-config` for linting
- No Vitest — Angular uses `ng test` (Karma/Jest via `@angular/build`)
- **Styling: utility classes first, inline styles second, never new CSS files.** Always reach for Cumulocity/Bootstrap utility classes (e.g. `p-16`, `d-flex`, `text-muted`). If a style is not covered by a utility class, use an inline `style` attribute. **Never create new `.css` files.**

## Testing

Run `pnpm test` (calls `ng test`).

## Maintaining Documentation

When making changes to the project:

- **`AGENTS.md`** — Update with technical details, architecture, and best practices for AI agents
  - Project architecture and file structure
  - Internal patterns and conventions
  - Development workflows
  - Testing strategies
  - Build/deployment processes
  - Code organization principles
  - Tool configurations and quirks

- **`README.md`** — Update with user-facing documentation for end users:
  - ✅ New exported utilities or functions from the package
  - ✅ New configuration options users can set
  - ✅ New CLI commands or features
  - ✅ Changes to existing API behavior
  - ✅ Environment variables users can set
  - ✅ Any feature users can configure, use, or interact with
  - ✅ Installation or setup instructions
  - ✅ Usage examples and code snippets

## Agent Guidelines

When working on this project:

1. **Use the `c8y-docs` MCP** for all Cumulocity-related questions — it contains the full official Cumulocity documentation including widget development, `@c8y/ngx-components` APIs, realtime services, inventory service, asset selectors, and plugin configuration. Prefer it over guessing or hallucinating API shapes.
2. **Prefer signals over RxJS — always.** Use `signal()`, `computed()`, and `effect()` for all internal state and reactive logic. `effect()` covers side-effect patterns (logging, DOM updates, triggering downstream work); `computed()` covers derived state. Only reach for RxJS when an external API strictly requires it (e.g. piping a realtime stream with `takeUntilDestroyed`). Never introduce a `Subject` or `BehaviorSubject` where a `WritableSignal` + `effect()` would work.
3. **Run tests** after making changes: `pnpm test:run` (runs once, no watch mode)
4. **Run linting** to ensure code quality: `pnpm lint`
5. **Run type checking** before committing: `pnpm typecheck`
6. **Update this file** when adding new modules, APIs, or changing architecture
7. **Keep exports in `src/index.ts`** — all public API should be exported from the main entry point
8. **Add tests** for new functionality in the `tests/` directory
9. **Record learnings** — When the user corrects a mistake or provides context about how something should be done, add it to the "Project Context & Learnings" section below if it's a recurring pattern (not a one-time fix)
10. **Notify documentation changes** — When updating `README.md` or `AGENTS.md`, explicitly call out the changes to the user at the end of your response so they can review and don't overlook them
11. **Never create new markdown files** unless the user explicitly asks for one. If a new markdown file is created, record it in the "Markdown Files" registry below with its path and purpose.

## Project Context & Learnings

This section captures project-specific knowledge, tool quirks, and lessons learned during development. When the user provides corrections or context about how things should be done in this project, add them here if they are recurring patterns (not a one-time fix).

> **Note:** Before adding something here, consider: Is this a one-time fix, or will it come up again? Only document patterns that are likely to recur or are notable enough to prevent future mistakes.

### Tools & Dependencies

- **`c8y-docs` MCP** — Use this MCP server to look up Cumulocity documentation. It covers widget development patterns, `@c8y/ngx-components` component APIs (asset selector, realtime services, inventory service, `hookWidget`), plugin configuration, and all official SDK guides. Always query it before implementing any Cumulocity-specific code.

### Patterns & Conventions

- **Signals over RxJS — always.** All internal state and reactive logic must use the signals primitives:
  - `signal()` — writable state
  - `computed()` — derived/memoised state
  - `effect()` — side effects and reactions (replaces RxJS `tap`, `Subject.next`, `BehaviorSubject`, manual subscriptions for internal logic)

  RxJS is only acceptable where the framework or a third-party API strictly forces it (e.g. piping a realtime stream with `takeUntilDestroyed`). Never use `Subject`, `BehaviorSubject`, or `ReplaySubject` for state or reactions that `signal()` + `effect()` can handle.

- **Cumulocity widget config component pattern — framework-forced exceptions.** The dashboard framework imposes specific constraints on the config component that override the signals-first rule:
  - `@Input() config` **must** be the classic decorator (not `input()`). The framework passes config to the component using the classic Angular input mechanism.
  - Config is saved by **mutating the `config` object in place** inside `addOnBeforeSave((config) => { Object.assign(config, formGroup.value); return true; })`. The framework serialises the mutated object.
  - The **live preview** requires a `BehaviorSubject<GlobeWidgetConfig>` + `async` pipe feeding a `<ng-template #preview>` that is registered with `WidgetConfigService.setPreview()` via `@ViewChild`. This is the only documented framework pattern and is a forced RxJS usage.
  - The config component connects to the parent dashboard form via `viewProviders: [{ provide: ControlContainer, useExisting: NgForm }]` and registers its `FormGroup` with `this.form.form.addControl('widgetConfig', this.formGroup)` in `ngOnInit`.
  - **View component** is unaffected — it correctly uses signal `input<GlobeWidgetConfig>()`.

- **Current product direction: built-in target selection, runtime device-position lookup.** Do not add arc-origin inputs or a custom target override to the widget config. The dashboard framework provides the selected device/group target to the widget config, and the custom config component should stay slim. Device positions are resolved in the widget when measurements arrive and cached for a bounded TTL. Destination-based arc rendering is deferred; the first visual milestone is a ripple at the emitting device.

- **Current config milestone: preview-first appearance tuning only.** The custom config component should stay minimal and focus on renderer appearance overrides that are immediately visible in preview. Do not reintroduce a custom source picker or dashboard-context toggle unless the product direction changes.

- **Styling: utility classes first, inline styles second, never new CSS files.** Always reach for the built-in Cumulocity/Bootstrap utility classes first (spacing, flex, typography, colours). If a specific style is not available as a utility class, use an inline `style` attribute directly on the element. **Never create new `.css` files.** The existing `globe-widget.component.css` is kept only for Angular's component registration and must remain empty.

- **Prefer the documented popover directive for widget overlays.** For compact overlay content inside widgets, use the Cumulocity-supported `popover` directive instead of a custom hover panel. If the widget container clips overflow, use `container="body"`; if the popover contains links or other interactive content, use a template popover with `[outsideClick]="true"` and click triggers.

### Common Mistakes to Avoid

<!-- Add things that have been done wrong before and should be avoided -->

## Markdown Files

This registry tracks every `.md` file in the repo and its purpose. Never create a new markdown file without updating this table.

| File                          | Purpose                                                                                      |
| ----------------------------- | -------------------------------------------------------------------------------------------- |
| `AGENTS.md`                   | Technical context, conventions, and guidelines for AI agents working on this project         |
| `README.md`                   | User-facing documentation shown on GitHub                                                    |
| `ACCEPTANCE_CRITERIA.md`      | Full feature requirements, data models, implementation phases, and resolved design decisions |
| `SESSION_MCP_WIDGET_BUILD.md` | Detailed session record of the AI-assisted widget build and Codex MCP usage                  |
| `src/app/README.md`           | In-platform readme shown in the Cumulocity plugin manager                                    |