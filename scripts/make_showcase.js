// Generate the showcase banner image for the README
// Arranges sprites in a horizontal strip with padding and dark background

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSpriteFile } from '../src/parser.js';
import { encodePNG, scalePixels } from '../src/png.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SCALE = 8;
const PADDING = 16; // pixels of padding between sprites (at final scale)
const BG_COLOR = [26, 26, 46, 255]; // #1a1a2e

const spriteFiles = [
  'sprites/showcase_mage.sprite',
  'sprites/showcase_slime.sprite',
  'sprites/showcase_chest.sprite',
  'sprites/showcase_potion.sprite',
  'sprites/showcase_gem.sprite',
  'sprites/showcase_mushroom.sprite',
];

const root = resolve(__dirname, '..');

// Parse all sprites
const sprites = spriteFiles.map(f => {
  const source = readFileSync(join(root, f), 'utf-8');
  return parseSpriteFile(source)[0];
});

// Scale each sprite
const scaled = sprites.map(s => {
  const r = scalePixels(s.pixels, s.width, s.height, SCALE);
  return { name: s.name, ...r };
});

// Calculate banner dimensions
const totalWidth = scaled.reduce((sum, s) => sum + s.width, 0) + PADDING * (scaled.length + 1);
const maxHeight = Math.max(...scaled.map(s => s.height));
const totalHeight = maxHeight + PADDING * 2;

// Create canvas with background
const pixels = Buffer.alloc(totalWidth * totalHeight * 4);
for (let i = 0; i < totalWidth * totalHeight; i++) {
  pixels[i * 4] = BG_COLOR[0];
  pixels[i * 4 + 1] = BG_COLOR[1];
  pixels[i * 4 + 2] = BG_COLOR[2];
  pixels[i * 4 + 3] = BG_COLOR[3];
}

// Place each sprite
let cursorX = PADDING;
for (const sprite of scaled) {
  const offsetY = PADDING + Math.floor((maxHeight - sprite.height) / 2);

  for (let y = 0; y < sprite.height; y++) {
    for (let x = 0; x < sprite.width; x++) {
      const si = (y * sprite.width + x) * 4;
      const alpha = sprite.pixels[si + 3];
      if (alpha === 0) continue; // skip transparent, show background

      const dx = cursorX + x;
      const dy = offsetY + y;
      const di = (dy * totalWidth + dx) * 4;
      pixels[di] = sprite.pixels[si];
      pixels[di + 1] = sprite.pixels[si + 1];
      pixels[di + 2] = sprite.pixels[si + 2];
      pixels[di + 3] = 255;
    }
  }

  cursorX += sprite.width + PADDING;
}

const png = encodePNG(pixels, totalWidth, totalHeight);
const outPath = join(root, 'assets', 'showcase.png');
mkdirSync(join(root, 'assets'), { recursive: true });
writeFileSync(outPath, png);
console.log(`Showcase → ${outPath} (${totalWidth}x${totalHeight})`);
