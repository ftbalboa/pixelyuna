// Sprite definition parser
// Format: .sprite files with palette + pixel grid + animation frames

/**
 * Parse a hex color string to RGBA values.
 * Supports: #RGB, #RGBA, #RRGGBB, #RRGGBBAA, "transparent"
 */
function parseColor(str) {
  str = str.trim().toLowerCase();

  if (str === 'transparent' || str === 'none') {
    return [0, 0, 0, 0];
  }

  if (!str.startsWith('#')) {
    throw new Error(`Invalid color: "${str}". Use hex (#ff0000) or "transparent".`);
  }

  const hex = str.slice(1);
  let r, g, b, a = 255;

  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  } else if (hex.length === 4) {
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
    a = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 6) {
    r = parseInt(hex.slice(0, 2), 16);
    g = parseInt(hex.slice(2, 4), 16);
    b = parseInt(hex.slice(4, 6), 16);
  } else if (hex.length === 8) {
    r = parseInt(hex.slice(0, 2), 16);
    g = parseInt(hex.slice(2, 4), 16);
    b = parseInt(hex.slice(4, 6), 16);
    a = parseInt(hex.slice(6, 8), 16);
  } else {
    throw new Error(`Invalid hex color: "${str}"`);
  }

  return [r, g, b, a];
}

/**
 * Render pixel rows using a palette into an RGBA buffer.
 */
function renderPixels(pixelRows, palette) {
  const height = pixelRows.length;
  const width = Math.max(...pixelRows.map(r => r.length));
  const pixels = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y++) {
    const row = pixelRows[y];
    for (let x = 0; x < width; x++) {
      const ch = x < row.length ? row[x] : '.';
      const color = palette[ch];
      if (!color) {
        throw new Error(
          `Unknown palette character "${ch}" at row ${y + 1}, col ${x + 1}. ` +
          `Define it in the palette section.`
        );
      }
      const i = (y * width + x) * 4;
      pixels[i] = color[0];
      pixels[i + 1] = color[1];
      pixels[i + 2] = color[2];
      pixels[i + 3] = color[3];
    }
  }

  return { width, height, pixels };
}

/**
 * Parse a .sprite source block.
 *
 * Supports two modes:
 * 1. Static sprite (has "pixels:" section, no "frame:" sections)
 * 2. Animated sprite (has "frame:" sections, optional "fps:")
 *
 * Static returns: { name, width, height, pixels, animated: false }
 * Animated returns: { name, fps, frames: [{ name, width, height, pixels }], width, height, animated: true }
 */
export function parseSprite(source) {
  const lines = source.split(/\r?\n/);
  let name = 'sprite';
  let fps = 8;
  const palette = {};

  // First pass: detect if this is an animation (has frame: lines)
  const hasFrames = lines.some(l => l.match(/^frame:\s*.+$/i));

  if (!hasFrames) {
    // Static sprite — original behavior
    const pixelRows = [];
    let section = null;

    for (const rawLine of lines) {
      const line = rawLine.trimEnd();

      if (line.trim() === '' || line.trim().startsWith('#')) continue;

      if (line.match(/^palette:\s*$/i)) { section = 'palette'; continue; }
      if (line.match(/^pixels:\s*$/i)) { section = 'pixels'; continue; }

      const nameMatch = line.match(/^name:\s*(.+)$/i);
      if (nameMatch) { name = nameMatch[1].trim(); continue; }

      if (section === 'palette') {
        const trimmed = line.trim();
        const char = trimmed[0];
        const color = trimmed.slice(1).trim();
        if (char && color) palette[char] = parseColor(color);
        continue;
      }

      if (section === 'pixels') {
        const content = line.replace(/^\s+/, '');
        if (content.length > 0) pixelRows.push(content);
        continue;
      }
    }

    if (Object.keys(palette).length === 0) {
      throw new Error('No palette defined. Add a "palette:" section.');
    }
    if (pixelRows.length === 0) {
      throw new Error('No pixel data. Add a "pixels:" or "frame:" section.');
    }

    const rendered = renderPixels(pixelRows, palette);
    return { name, ...rendered, animated: false };
  }

  // Animated sprite — parse frames
  let section = null; // 'palette' | 'frame'
  let currentFrame = null;
  const frames = [];
  const framePixelRows = [];

  function flushFrame() {
    if (currentFrame && framePixelRows.length > 0) {
      const rendered = renderPixels(framePixelRows, palette);
      frames.push({ name: currentFrame, ...rendered });
      framePixelRows.length = 0;
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.trim() === '' || line.trim().startsWith('#')) continue;

    // Global properties (before any frame)
    const nameMatch = line.match(/^name:\s*(.+)$/i);
    if (nameMatch) { name = nameMatch[1].trim(); continue; }

    const fpsMatch = line.match(/^fps:\s*(\d+)$/i);
    if (fpsMatch) { fps = parseInt(fpsMatch[1], 10); continue; }

    if (line.match(/^palette:\s*$/i)) { section = 'palette'; continue; }

    const frameMatch = line.match(/^frame:\s*(.+)$/i);
    if (frameMatch) {
      flushFrame();
      currentFrame = frameMatch[1].trim();
      section = 'frame';
      continue;
    }

    if (section === 'palette') {
      const trimmed = line.trim();
      const char = trimmed[0];
      const color = trimmed.slice(1).trim();
      if (char && color) palette[char] = parseColor(color);
      continue;
    }

    if (section === 'frame') {
      const content = line.replace(/^\s+/, '');
      if (content.length > 0) framePixelRows.push(content);
      continue;
    }
  }

  // Flush last frame
  flushFrame();

  if (Object.keys(palette).length === 0) {
    throw new Error('No palette defined. Add a "palette:" section.');
  }
  if (frames.length === 0) {
    throw new Error('No frames found. Add "frame: name" sections with pixel data.');
  }

  const width = Math.max(...frames.map(f => f.width));
  const height = Math.max(...frames.map(f => f.height));

  return { name, fps, frames, width, height, animated: true };
}

/**
 * Parse a .sprite file that may contain multiple sprites (separated by ---).
 * @param {string} source
 * @returns {Array}
 */
export function parseSpriteFile(source) {
  const blocks = source.split(/^---\s*$/m);
  return blocks
    .filter(b => b.trim().length > 0)
    .map(block => parseSprite(block));
}
