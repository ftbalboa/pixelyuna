---
name: sprite
description: Generate pixel art sprites and animations using the pixelyuna .sprite format
user_invocable: true
---

# Sprite Generation Skill

You are generating pixel art sprites for the pixelyuna engine. You write `.sprite` files and compile them to PNG.

## .sprite Format Spec

### Static Sprite
```
name: sprite_name

palette:
  . transparent
  x #2a2a2a
  r #ff4444

pixels:
  ..xxxx..
  .xrrrrx.
  xrrrrrrx
```

### Animated Sprite
```
name: anim_name
fps: 8

palette:
  . transparent
  x #ff0000

frame: idle
  ..xx..
  .xxxx.

frame: walk_1
  .xxxx.
  xx..xx
```

## Rules

1. **palette section** comes first, then pixels/frames
2. **`.`** is ALWAYS transparent — never assign it a visible color
3. Each palette character is exactly ONE character (letter, number, or symbol)
4. All pixel rows in a sprite/frame MUST have the same length (pad with `.` if needed)
5. For animations, all frames SHOULD have the same dimensions for clean strips
6. Use descriptive frame names: `idle`, `walk_1`, `walk_2`, `attack_1`, etc.
7. Use `---` separator to define multiple independent sprites in one file

## Palette Design Guidelines

- Use 2-3 shades per material (base + highlight + shadow)
- Common palette naming conventions:
  - `.` = transparent (always)
  - `k` = black/dark outline
  - `w` = white/highlight
  - `s` = skin
  - `h` = hair
  - `b` = body/clothing
  - `r/g/b` = red/green/blue
  - `d` = dark variant
  - `l` = light variant
- Keep palettes small (8-12 colors max) for authentic pixel art feel
- Consider a dark outline (`k`) around the sprite for readability on any background

## Size Guidelines

- Characters: 12x16 or 16x16
- Items/pickups: 8x8 or 10x10
- Tiles: 16x16 (standard tilemap)
- Large enemies/bosses: 24x24 or 32x32
- UI elements: vary by need

## Workflow

1. Write the `.sprite` file to `sprites/` directory
2. Compile:
   ```bash
   node src/cli.js compile sprites/<name>.sprite --out output/ --scale 4
   ```
3. For animations:
   ```bash
   node src/cli.js animate sprites/<name>.sprite --out output/ --scale 4
   ```
4. Preview animations: open `output/<name>_preview.html` in browser
5. Spritesheet of all sprites:
   ```bash
   node src/cli.js sheet sprites/ --out output/spritesheet.png --scale 4
   ```

## Output Files

| Input | Output |
|---|---|
| Static sprite | `name.png` |
| Animated sprite | `name_strip.png` + `name.json` + `name_preview.html` |
| Sheet command | `spritesheet.png` (all sprites in grid) |

## JSON Metadata Format (animations)
```json
{
  "name": "hero_walk",
  "fps": 6,
  "frameCount": 4,
  "frameWidth": 48,
  "frameHeight": 64,
  "frames": [
    { "name": "idle", "x": 0, "y": 0, "width": 48, "height": 64 },
    { "name": "walk_1", "x": 48, "y": 0, "width": 48, "height": 64 }
  ]
}
```

## When the user asks you to create a sprite:

1. Understand what they want (character, item, tile, enemy, etc.)
2. Choose appropriate size
3. Design a palette with meaningful colors
4. Draw the pixel grid character by character — think about silhouette, shading, and readability
5. Write the `.sprite` file to `sprites/`
6. Compile it with `--scale 4` (or as requested)
7. Show the user the result by reading the output PNG
