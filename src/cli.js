#!/usr/bin/env node

// pixelyuna CLI — compile .sprite files to PNG

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join, basename, extname, resolve, dirname } from 'node:path';
import { parseSpriteFile } from './parser.js';
import { encodePNG, scalePixels } from './png.js';
import { generatePreviewHTML } from './preview.js';

function usage() {
  console.log(`
pixelyuna — pixel art sprite compiler

Usage:
  pixelyuna compile <file|dir> [options]    Compile .sprite files to PNG
  pixelyuna sheet <file|dir> [options]      Compile sprites into a spritesheet
  pixelyuna animate <file> [options]        Compile animated sprite to strip + preview

Options:
  --out <path>       Output file or directory (default: ./output/)
  --scale <n>        Scale factor, e.g. 4 (default: 1)
  --columns <n>      Columns in spritesheet (default: auto)
  --preview          Generate HTML preview for animations (default: true)

Examples:
  pixelyuna compile sprites/hero.sprite --scale 4
  pixelyuna compile sprites/ --out output/
  pixelyuna sheet sprites/ --out output/sheet.png --scale 2
  pixelyuna animate sprites/hero_walk.sprite --scale 4
`);
}

function parseArgs(args) {
  const opts = { scale: 1, out: './output/', columns: 0, preview: true };
  const positional = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--out' && args[i + 1]) {
      opts.out = args[++i];
    } else if (args[i] === '--scale' && args[i + 1]) {
      opts.scale = parseInt(args[++i], 10);
    } else if (args[i] === '--columns' && args[i + 1]) {
      opts.columns = parseInt(args[++i], 10);
    } else if (args[i] === '--no-preview') {
      opts.preview = false;
    } else if (!args[i].startsWith('--')) {
      positional.push(args[i]);
    }
  }

  return { ...opts, positional };
}

function loadSprites(pathArg) {
  const files = [];
  const resolved = resolve(pathArg);

  if (existsSync(resolved)) {
    try {
      const entries = readdirSync(resolved);
      for (const entry of entries) {
        if (extname(entry) === '.sprite') {
          const filePath = join(resolved, entry);
          const source = readFileSync(filePath, 'utf-8');
          files.push(...parseSpriteFile(source));
        }
      }
    } catch {
      const source = readFileSync(resolved, 'utf-8');
      files.push(...parseSpriteFile(source));
    }
  } else {
    console.error(`Error: "${pathArg}" not found.`);
    process.exit(1);
  }

  return files;
}

function compileCommand(args) {
  const opts = parseArgs(args);
  const input = opts.positional[0];

  if (!input) {
    console.error('Error: specify a .sprite file or directory.');
    process.exit(1);
  }

  const sprites = loadSprites(input);
  const outDir = opts.out.endsWith('.png') ? dirname(opts.out) : opts.out;
  mkdirSync(outDir, { recursive: true });

  let count = 0;

  for (const sprite of sprites) {
    if (sprite.animated) {
      // Animated sprites get compiled via animate logic
      compileAnimation(sprite, outDir, opts);
    } else {
      let { pixels, width, height } = sprite;

      if (opts.scale > 1) {
        const scaled = scalePixels(pixels, width, height, opts.scale);
        pixels = scaled.pixels;
        width = scaled.width;
        height = scaled.height;
      }

      const png = encodePNG(pixels, width, height);
      const outPath = join(outDir, `${sprite.name}.png`);
      writeFileSync(outPath, png);
      console.log(`  ${sprite.name} → ${outPath} (${width}x${height})`);
    }
    count++;
  }

  console.log(`\nCompiled ${count} sprite(s).`);
}

function compileAnimation(anim, outDir, opts) {
  const { name, fps, frames, width: cellW, height: cellH } = anim;

  // Build horizontal strip
  let stripW = cellW * frames.length;
  let stripH = cellH;
  const stripPixels = Buffer.alloc(stripW * stripH * 4);

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const offsetX = i * cellW;
    // Center frame in cell if sizes differ
    const padX = Math.floor((cellW - frame.width) / 2);
    const padY = Math.floor((cellH - frame.height) / 2);

    for (let y = 0; y < frame.height; y++) {
      for (let x = 0; x < frame.width; x++) {
        const si = (y * frame.width + x) * 4;
        const dx = offsetX + padX + x;
        const dy = padY + y;
        const di = (dy * stripW + dx) * 4;
        stripPixels[di] = frame.pixels[si];
        stripPixels[di + 1] = frame.pixels[si + 1];
        stripPixels[di + 2] = frame.pixels[si + 2];
        stripPixels[di + 3] = frame.pixels[si + 3];
      }
    }
  }

  // Apply scale
  let finalPixels = stripPixels;
  let finalW = stripW;
  let finalH = stripH;

  if (opts.scale > 1) {
    const scaled = scalePixels(stripPixels, stripW, stripH, opts.scale);
    finalPixels = scaled.pixels;
    finalW = scaled.width;
    finalH = scaled.height;
  }

  // Write strip PNG
  const stripPng = encodePNG(finalPixels, finalW, finalH);
  const stripPath = join(outDir, `${name}_strip.png`);
  writeFileSync(stripPath, stripPng);

  const scaledCellW = cellW * (opts.scale || 1);
  const scaledCellH = cellH * (opts.scale || 1);

  // Write JSON metadata
  const meta = {
    name,
    fps,
    frameCount: frames.length,
    frameWidth: scaledCellW,
    frameHeight: scaledCellH,
    stripWidth: finalW,
    stripHeight: finalH,
    frames: frames.map((f, i) => ({
      name: f.name,
      x: i * scaledCellW,
      y: 0,
      width: scaledCellW,
      height: scaledCellH,
    })),
  };

  const metaPath = join(outDir, `${name}.json`);
  writeFileSync(metaPath, JSON.stringify(meta, null, 2));

  // Write HTML preview
  if (opts.preview !== false) {
    const html = generatePreviewHTML(name, meta, `${name}_strip.png`);
    const htmlPath = join(outDir, `${name}_preview.html`);
    writeFileSync(htmlPath, html);
    console.log(`  ${name} → strip: ${stripPath} (${finalW}x${finalH}, ${frames.length} frames @ ${fps}fps)`);
    console.log(`  ${name} → meta:  ${metaPath}`);
    console.log(`  ${name} → preview: ${htmlPath}`);
  } else {
    console.log(`  ${name} → strip: ${stripPath} (${finalW}x${finalH}, ${frames.length} frames @ ${fps}fps)`);
    console.log(`  ${name} → meta:  ${metaPath}`);
  }
}

function animateCommand(args) {
  const opts = parseArgs(args);
  const input = opts.positional[0];

  if (!input) {
    console.error('Error: specify a .sprite file with animation frames.');
    process.exit(1);
  }

  const sprites = loadSprites(input);
  const outDir = opts.out.endsWith('.png') ? dirname(opts.out) : opts.out;
  mkdirSync(outDir, { recursive: true });

  let count = 0;

  for (const sprite of sprites) {
    if (!sprite.animated) {
      console.log(`  Skipping "${sprite.name}" — not animated (no frame: sections).`);
      continue;
    }
    compileAnimation(sprite, outDir, opts);
    count++;
  }

  if (count === 0) {
    console.error('No animated sprites found. Use "frame: name" sections in your .sprite file.');
    process.exit(1);
  }

  console.log(`\nCompiled ${count} animation(s).`);
}

function sheetCommand(args) {
  const opts = parseArgs(args);
  const input = opts.positional[0];

  if (!input) {
    console.error('Error: specify a .sprite file or directory.');
    process.exit(1);
  }

  const sprites = loadSprites(input);

  if (sprites.length === 0) {
    console.error('No sprites found.');
    process.exit(1);
  }

  // For sheet, flatten animated sprites into their first frame
  const flatSprites = sprites.map(s => {
    if (s.animated) {
      return { name: s.name, ...s.frames[0] };
    }
    return s;
  });

  const cellW = Math.max(...flatSprites.map(s => s.width));
  const cellH = Math.max(...flatSprites.map(s => s.height));

  const cols = opts.columns > 0 ? opts.columns : Math.ceil(Math.sqrt(flatSprites.length));
  const rows = Math.ceil(flatSprites.length / cols);

  let sheetW = cols * cellW;
  let sheetH = rows * cellH;
  const sheetPixels = Buffer.alloc(sheetW * sheetH * 4);

  for (let i = 0; i < flatSprites.length; i++) {
    const sprite = flatSprites[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const offsetX = col * cellW;
    const offsetY = row * cellH;

    const padX = Math.floor((cellW - sprite.width) / 2);
    const padY = Math.floor((cellH - sprite.height) / 2);

    for (let y = 0; y < sprite.height; y++) {
      for (let x = 0; x < sprite.width; x++) {
        const si = (y * sprite.width + x) * 4;
        const dx = offsetX + padX + x;
        const dy = offsetY + padY + y;
        const di = (dy * sheetW + dx) * 4;
        sheetPixels[di] = sprite.pixels[si];
        sheetPixels[di + 1] = sprite.pixels[si + 1];
        sheetPixels[di + 2] = sprite.pixels[si + 2];
        sheetPixels[di + 3] = sprite.pixels[si + 3];
      }
    }
  }

  if (opts.scale > 1) {
    const scaled = scalePixels(sheetPixels, sheetW, sheetH, opts.scale);
    const png = encodePNG(scaled.pixels, scaled.width, scaled.height);
    const outPath = opts.out.endsWith('.png') ? opts.out : join(opts.out, 'spritesheet.png');
    mkdirSync(dirname(resolve(outPath)), { recursive: true });
    writeFileSync(outPath, png);
    console.log(`Spritesheet → ${outPath} (${scaled.width}x${scaled.height}, ${flatSprites.length} sprites)`);
  } else {
    const png = encodePNG(sheetPixels, sheetW, sheetH);
    const outPath = opts.out.endsWith('.png') ? opts.out : join(opts.out, 'spritesheet.png');
    mkdirSync(dirname(resolve(outPath)), { recursive: true });
    writeFileSync(outPath, png);
    console.log(`Spritesheet → ${outPath} (${sheetW}x${sheetH}, ${flatSprites.length} sprites)`);
  }
}

// Main
const args = process.argv.slice(2);
const command = args[0];

if (!command || command === '--help' || command === '-h') {
  usage();
} else if (command === 'compile') {
  compileCommand(args.slice(1));
} else if (command === 'sheet') {
  sheetCommand(args.slice(1));
} else if (command === 'animate') {
  animateCommand(args.slice(1));
} else {
  console.error(`Unknown command: "${command}". Use --help for usage.`);
  process.exit(1);
}
