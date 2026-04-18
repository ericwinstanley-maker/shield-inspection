// ============================================================
// PHOTO ANNOTATOR
// Full-screen annotation editor for inspection photos
// Tools: Circle, Arrow, Freehand
// ============================================================

/**
 * Opens the photo annotation editor.
 * @param {Blob} imageBlob - The original photo blob
 * @returns {Promise<Blob|null>} - The annotated image blob, or null if cancelled
 */
export function openAnnotator(imageBlob) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(imageBlob);
    const img = new Image();

    img.onload = () => {
      const editor = createEditor(img, url, resolve);
      document.body.appendChild(editor);
      requestAnimationFrame(() => editor.classList.add('open'));
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(imageBlob); // Return original on error
    };

    img.src = url;
  });
}

function createEditor(img, objectUrl, resolve) {
  // Calculate canvas dimensions (fit to screen, max 1200px wide)
  const maxW = Math.min(window.innerWidth, 1200);
  const maxH = window.innerHeight - 120; // Leave room for toolbar
  const scale = Math.min(maxW / img.width, maxH / img.height, 1);
  const cw = Math.round(img.width * scale);
  const ch = Math.round(img.height * scale);

  // State
  let currentTool = 'arrow';
  let currentColor = '#FF3333';
  const annotations = []; // Array of annotation objects for undo
  let isDrawing = false;
  let startX = 0, startY = 0;
  let freehandPoints = [];

  // Create DOM
  const overlay = document.createElement('div');
  overlay.className = 'annotator-overlay';
  overlay.innerHTML = `
    <div class="annotator-header">
      <button class="annotator-header-btn" id="ann-cancel">✕ Cancel</button>
      <span class="annotator-title">Annotate Photo</span>
      <button class="annotator-header-btn annotator-done-btn" id="ann-done">Done ✓</button>
    </div>
    <div class="annotator-canvas-wrap">
      <canvas id="ann-canvas" width="${cw}" height="${ch}"></canvas>
      <canvas id="ann-preview" width="${cw}" height="${ch}"></canvas>
    </div>
    <div class="annotator-toolbar">
      <div class="annotator-tools">
        <button class="annotator-tool active" data-tool="arrow" title="Arrow">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="19" x2="19" y2="5"/>
            <polyline points="10 5 19 5 19 14"/>
          </svg>
        </button>
        <button class="annotator-tool" data-tool="circle" title="Circle">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="12" cy="12" r="9"/>
          </svg>
        </button>
        <button class="annotator-tool" data-tool="freehand" title="Freehand">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 17c1-2 3-6 5-6s2 4 4 4 3-8 5-8 2 4 4 4"/>
          </svg>
        </button>
      </div>
      <div class="annotator-colors">
        <button class="annotator-color active" data-color="#FF3333" style="background:#FF3333"></button>
        <button class="annotator-color" data-color="#FFDD33" style="background:#FFDD33"></button>
        <button class="annotator-color" data-color="#33AAFF" style="background:#33AAFF"></button>
        <button class="annotator-color" data-color="#FFFFFF" style="background:#FFFFFF; border: 2px solid #999"></button>
      </div>
      <div class="annotator-actions">
        <button class="annotator-action" id="ann-undo" title="Undo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="1 4 1 10 7 10"/>
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
          </svg>
        </button>
      </div>
    </div>
  `;

  // Get canvas contexts
  const canvas = overlay.querySelector('#ann-canvas');
  const preview = overlay.querySelector('#ann-preview');
  const ctx = canvas.getContext('2d');
  const pCtx = preview.getContext('2d');

  // Draw the photo on the main canvas
  ctx.drawImage(img, 0, 0, cw, ch);

  // --- Helper: get position relative to canvas ---
  function getPos(e) {
    const rect = preview.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
  }

  // --- Drawing functions ---
  function drawArrow(context, x1, y1, x2, y2, color) {
    const headLen = 14;
    const angle = Math.atan2(y2 - y1, x2 - x1);

    context.strokeStyle = color;
    context.fillStyle = color;
    context.lineWidth = 3;
    context.lineCap = 'round';

    // Line
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.stroke();

    // Arrowhead
    context.beginPath();
    context.moveTo(x2, y2);
    context.lineTo(
      x2 - headLen * Math.cos(angle - Math.PI / 6),
      y2 - headLen * Math.sin(angle - Math.PI / 6)
    );
    context.lineTo(
      x2 - headLen * Math.cos(angle + Math.PI / 6),
      y2 - headLen * Math.sin(angle + Math.PI / 6)
    );
    context.closePath();
    context.fill();
  }

  function drawCircle(context, cx, cy, rx, ry, color) {
    context.strokeStyle = color;
    context.lineWidth = 3;
    context.lineCap = 'round';
    context.beginPath();
    context.ellipse(cx, cy, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2);
    context.stroke();
  }

  function drawFreehand(context, points, color) {
    if (points.length < 2) return;
    context.strokeStyle = color;
    context.lineWidth = 3;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      context.lineTo(points[i].x, points[i].y);
    }
    context.stroke();
  }

  // --- Redraw all annotations on the main canvas ---
  function redrawAll() {
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, 0, 0, cw, ch);
    for (const ann of annotations) {
      if (ann.type === 'arrow') {
        drawArrow(ctx, ann.x1, ann.y1, ann.x2, ann.y2, ann.color);
      } else if (ann.type === 'circle') {
        drawCircle(ctx, ann.cx, ann.cy, ann.rx, ann.ry, ann.color);
      } else if (ann.type === 'freehand') {
        drawFreehand(ctx, ann.points, ann.color);
      }
    }
  }

  // --- Touch/Mouse handlers ---
  function onStart(e) {
    e.preventDefault();
    isDrawing = true;
    const pos = getPos(e);
    startX = pos.x;
    startY = pos.y;
    freehandPoints = [{ x: pos.x, y: pos.y }];
  }

  function onMove(e) {
    e.preventDefault();
    if (!isDrawing) return;
    const pos = getPos(e);

    pCtx.clearRect(0, 0, cw, ch);

    if (currentTool === 'arrow') {
      drawArrow(pCtx, startX, startY, pos.x, pos.y, currentColor);
    } else if (currentTool === 'circle') {
      const cx = (startX + pos.x) / 2;
      const cy = (startY + pos.y) / 2;
      const rx = Math.abs(pos.x - startX) / 2;
      const ry = Math.abs(pos.y - startY) / 2;
      drawCircle(pCtx, cx, cy, rx, ry, currentColor);
    } else if (currentTool === 'freehand') {
      freehandPoints.push({ x: pos.x, y: pos.y });
      drawFreehand(pCtx, freehandPoints, currentColor);
    }
  }

  function onEnd(e) {
    if (e) e.preventDefault();
    if (!isDrawing) return;
    isDrawing = false;

    const pos = e.changedTouches ? getEndPos(e) : (e.type === 'mouseleave' ? { x: startX, y: startY } : getPos(e));

    // Save annotation
    if (currentTool === 'arrow') {
      const dist = Math.hypot(pos.x - startX, pos.y - startY);
      if (dist > 10) {
        annotations.push({ type: 'arrow', x1: startX, y1: startY, x2: pos.x, y2: pos.y, color: currentColor });
      }
    } else if (currentTool === 'circle') {
      const rx = Math.abs(pos.x - startX) / 2;
      const ry = Math.abs(pos.y - startY) / 2;
      if (rx > 5 || ry > 5) {
        annotations.push({
          type: 'circle',
          cx: (startX + pos.x) / 2,
          cy: (startY + pos.y) / 2,
          rx, ry,
          color: currentColor
        });
      }
    } else if (currentTool === 'freehand') {
      if (freehandPoints.length > 2) {
        annotations.push({ type: 'freehand', points: [...freehandPoints], color: currentColor });
      }
    }

    pCtx.clearRect(0, 0, cw, ch);
    redrawAll();
    freehandPoints = [];
  }

  function getEndPos(e) {
    const rect = preview.getBoundingClientRect();
    const touch = e.changedTouches[0];
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  }

  // Bind events
  preview.addEventListener('mousedown', onStart);
  preview.addEventListener('mousemove', onMove);
  preview.addEventListener('mouseup', onEnd);
  preview.addEventListener('mouseleave', onEnd);
  preview.addEventListener('touchstart', onStart, { passive: false });
  preview.addEventListener('touchmove', onMove, { passive: false });
  preview.addEventListener('touchend', onEnd, { passive: false });
  preview.addEventListener('touchcancel', onEnd);

  // --- Toolbar events ---
  // Tool selection
  overlay.querySelectorAll('.annotator-tool').forEach(btn => {
    btn.addEventListener('click', () => {
      overlay.querySelectorAll('.annotator-tool').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTool = btn.dataset.tool;
    });
  });

  // Color selection
  overlay.querySelectorAll('.annotator-color').forEach(btn => {
    btn.addEventListener('click', () => {
      overlay.querySelectorAll('.annotator-color').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentColor = btn.dataset.color;
    });
  });

  // Undo
  overlay.querySelector('#ann-undo').addEventListener('click', () => {
    if (annotations.length > 0) {
      annotations.pop();
      redrawAll();
    }
  });

  // Cancel
  overlay.querySelector('#ann-cancel').addEventListener('click', () => {
    closeEditor(overlay, objectUrl);
    resolve(null);
  });

  // Done — composite and export
  overlay.querySelector('#ann-done').addEventListener('click', async () => {
    // Composite at full resolution
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = img.width;
    exportCanvas.height = img.height;
    const eCtx = exportCanvas.getContext('2d');
    const sx = img.width / cw;
    const sy = img.height / ch;

    // Draw original photo at full res
    eCtx.drawImage(img, 0, 0);

    // Draw annotations scaled up to full res
    eCtx.save();
    eCtx.scale(sx, sy);
    for (const ann of annotations) {
      if (ann.type === 'arrow') {
        drawArrow(eCtx, ann.x1, ann.y1, ann.x2, ann.y2, ann.color);
      } else if (ann.type === 'circle') {
        drawCircle(eCtx, ann.cx, ann.cy, ann.rx, ann.ry, ann.color);
      } else if (ann.type === 'freehand') {
        drawFreehand(eCtx, ann.points, ann.color);
      }
    }
    eCtx.restore();

    // Export as JPEG blob
    exportCanvas.toBlob((blob) => {
      closeEditor(overlay, objectUrl);
      resolve(blob);
    }, 'image/jpeg', 0.85);
  });

  return overlay;
}

function closeEditor(overlay, objectUrl) {
  overlay.classList.remove('open');
  setTimeout(() => {
    overlay.remove();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }, 300);
}
