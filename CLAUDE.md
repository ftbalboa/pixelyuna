# pixelyuna

Pixel art sprite compiler for game development. Images are just bytes — no image AI, no designers, no dependencies.

## Stack
- Node.js (zero npm dependencies)
- PNG encoder built from scratch using only `zlib`
- Custom `.sprite` text format

## Project Structure
```
src/
  cli.js      — CLI entry point (compile, sheet, animate commands)
  png.js      — Raw PNG encoder (RGBA, CRC32, DEFLATE)
  parser.js   — .sprite format parser (static + animated)
  preview.js  — HTML animation preview generator
sprites/      — Source .sprite definitions
output/       — Compiled PNGs, strips, metadata, previews
```

## Commands
```bash
node src/cli.js compile <file|dir> --out output/ --scale 4
node src/cli.js animate <file> --out output/ --scale 4
node src/cli.js sheet <dir> --out output/spritesheet.png --scale 4
```

## Key Conventions
- Sprites are text files (.sprite) — character grids with color palettes
- `.` is always transparent in palettes
- Animations use `frame:` sections + `fps:` property
- Scale flag does nearest-neighbor upscale (no blur)
- Animated output: strip PNG + JSON metadata + HTML preview
- Use the `/sprite` skill to generate new sprites
