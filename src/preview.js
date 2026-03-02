// HTML animation preview generator
// Produces a self-contained HTML file that animates a spritesheet strip

/**
 * Generate an HTML preview file for an animated sprite.
 * @param {string} name - Animation name
 * @param {object} meta - Animation metadata (fps, frames, dimensions)
 * @param {string} stripFilename - Filename of the strip PNG (relative)
 * @returns {string} Complete HTML file contents
 */
export function generatePreviewHTML(name, meta, stripFilename) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${name} — pixelyuna preview</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: #1a1a2e;
    color: #e0e0e0;
    font-family: monospace;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    gap: 24px;
  }
  h1 { font-size: 16px; color: #888; font-weight: normal; }
  .preview-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }
  canvas {
    image-rendering: pixelated;
    image-rendering: crisp-edges;
    border: 1px solid #333;
    background:
      repeating-conic-gradient(#2a2a3e 0% 25%, #222238 0% 50%) 0 0 / 16px 16px;
  }
  .controls {
    display: flex;
    gap: 12px;
    align-items: center;
  }
  button {
    background: #333;
    color: #e0e0e0;
    border: 1px solid #555;
    padding: 6px 14px;
    font-family: monospace;
    font-size: 13px;
    cursor: pointer;
    border-radius: 3px;
  }
  button:hover { background: #444; }
  button.active { background: #4a6; color: #fff; border-color: #4a6; }
  .info {
    font-size: 12px;
    color: #666;
    text-align: center;
    line-height: 1.6;
  }
  .frame-label {
    font-size: 13px;
    color: #aaa;
    min-width: 120px;
    text-align: center;
  }
  .strip-preview {
    margin-top: 16px;
    opacity: 0.6;
  }
  .strip-preview img {
    image-rendering: pixelated;
    image-rendering: crisp-edges;
    max-width: 90vw;
  }
  .speed-control {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  input[type="range"] {
    width: 100px;
    accent-color: #4a6;
  }
</style>
</head>
<body>

<h1>pixelyuna — ${name}</h1>

<div class="preview-area">
  <canvas id="canvas" width="${meta.frameWidth * 4}" height="${meta.frameHeight * 4}"></canvas>

  <div class="controls">
    <button id="playBtn" class="active" onclick="togglePlay()">Pause</button>
    <button onclick="stepFrame(-1)">← Prev</button>
    <button onclick="stepFrame(1)">Next →</button>
    <div class="speed-control">
      <span>Speed:</span>
      <input type="range" id="speedSlider" min="1" max="30" value="${meta.fps}" oninput="setSpeed(this.value)">
      <span id="fpsLabel">${meta.fps} fps</span>
    </div>
  </div>

  <div class="frame-label" id="frameLabel">Loading...</div>
</div>

<div class="strip-preview">
  <img id="stripImg" alt="strip">
</div>

<div class="info">
  ${meta.frameCount} frames · ${meta.frameWidth}x${meta.frameHeight}px per frame · displayed at ${meta.frameWidth * 4}x${meta.frameHeight * 4}px
</div>

<script>
const meta = ${JSON.stringify(meta)};
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const frameLabel = document.getElementById('frameLabel');

ctx.imageSmoothingEnabled = false;

let strip = new Image();
let currentFrame = 0;
let playing = true;
let fps = meta.fps;
let lastTime = 0;
let frameDuration = 1000 / fps;

strip.onload = () => {
  document.getElementById('stripImg').src = strip.src;
  requestAnimationFrame(loop);
};
strip.src = '${stripFilename}';

function drawFrame(idx) {
  const f = meta.frames[idx];
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(
    strip,
    f.x, f.y, f.width, f.height,
    0, 0, canvas.width, canvas.height
  );
  frameLabel.textContent = f.name + ' (' + (idx + 1) + '/' + meta.frameCount + ')';
}

function loop(time) {
  requestAnimationFrame(loop);
  if (!playing) return;
  if (time - lastTime >= frameDuration) {
    lastTime = time;
    drawFrame(currentFrame);
    currentFrame = (currentFrame + 1) % meta.frameCount;
  }
}

function togglePlay() {
  playing = !playing;
  const btn = document.getElementById('playBtn');
  btn.textContent = playing ? 'Pause' : 'Play';
  btn.classList.toggle('active', playing);
  if (!playing) drawFrame(currentFrame);
}

function stepFrame(dir) {
  playing = false;
  document.getElementById('playBtn').textContent = 'Play';
  document.getElementById('playBtn').classList.remove('active');
  currentFrame = (currentFrame + dir + meta.frameCount) % meta.frameCount;
  drawFrame(currentFrame);
}

function setSpeed(val) {
  fps = parseInt(val);
  frameDuration = 1000 / fps;
  document.getElementById('fpsLabel').textContent = fps + ' fps';
}
</script>

</body>
</html>`;
}
