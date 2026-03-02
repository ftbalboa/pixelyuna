# Changelog

## [0.1.0] - 2026-03-02

### Added
- **PNG encoder from scratch** — zero dependencies, pure Node.js `zlib`. RGBA with transparency support.
- **`.sprite` text format** — define sprites as character grids with color palettes. What you see is what you get.
- **Static sprite compilation** — `.sprite` → `.png` with nearest-neighbor upscaling (`--scale`).
- **Animation support** — `frame:` sections with `fps:` property for walk cycles, attacks, etc.
- **Animation output** — horizontal strip PNG + JSON metadata + interactive HTML preview.
- **Spritesheet builder** — combine multiple sprites into a single atlas PNG.
- **CLI commands**: `compile`, `animate`, `sheet`.
- **HTML animation previewer** — play/pause, frame stepping, speed control, checkerboard transparency background. Zero dependencies, just open in browser.
- **Claude Code skill** (`/sprite`) — invoke from any conversation to generate sprites with full format context.
- **Example sprites**: hero, heart, tree, sword, hero walk cycle.
