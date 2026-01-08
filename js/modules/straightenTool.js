/**
 * Straighten/Deskew Tool Module
 * Rotate images to correct alignment
 */

/**
 * Create straighten tool
 * @param {HTMLCanvasElement} sourceCanvas - Source canvas
 * @param {Object} options - Configuration options
 * @returns {Object} - Straighten tool controller
 */
export function createStraightenTool(sourceCanvas, options = {}) {
    const {
        container,
        onAngleChange = () => {},
        onApply = () => {},
        maxAngle = 45
    } = options;

    let currentAngle = 0;
    let isDrawingLine = false;
    let lineStart = null;
    let lineEnd = null;

    // Create preview canvas
    const previewCanvas = document.createElement('canvas');
    previewCanvas.width = sourceCanvas.width;
    previewCanvas.height = sourceCanvas.height;
    previewCanvas.className = 'straighten-preview';
    previewCanvas.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
    `;
    const previewCtx = previewCanvas.getContext('2d');

    // Create overlay for line drawing
    const overlay = document.createElement('canvas');
    overlay.width = sourceCanvas.width;
    overlay.height = sourceCanvas.height;
    overlay.className = 'straighten-overlay';
    overlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        cursor: crosshair;
        z-index: 50;
    `;
    const overlayCtx = overlay.getContext('2d');

    // Create toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'straighten-toolbar';
    toolbar.innerHTML = `
        <div class="straighten-controls">
            <button class="straighten-btn rotate-left" title="Rotate left">
                <span class="material-symbols-outlined">rotate_left</span>
            </button>
            <div class="angle-display">
                <span class="angle-value">0.0°</span>
            </div>
            <button class="straighten-btn rotate-right" title="Rotate right">
                <span class="material-symbols-outlined">rotate_right</span>
            </button>
        </div>
        <div class="straighten-slider-container">
            <input type="range" class="straighten-slider" min="${-maxAngle}" max="${maxAngle}" step="0.1" value="0">
        </div>
        <div class="straighten-info">
            <span class="material-symbols-outlined">info</span>
            Draw a line along an edge that should be horizontal
        </div>
        <div class="straighten-actions">
            <button class="straighten-btn auto-btn">
                <span class="material-symbols-outlined">auto_fix_high</span>
                Auto
            </button>
            <button class="straighten-btn reset-btn">Reset</button>
            <button class="straighten-btn apply-btn primary">Apply</button>
        </div>
    `;

    // Grid overlay for alignment reference
    const gridCanvas = document.createElement('canvas');
    gridCanvas.width = sourceCanvas.width;
    gridCanvas.height = sourceCanvas.height;
    gridCanvas.className = 'straighten-grid';
    gridCanvas.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        opacity: 0.3;
    `;
    const gridCtx = gridCanvas.getContext('2d');
    drawGrid(gridCtx, gridCanvas.width, gridCanvas.height);

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .straighten-toolbar {
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(16, 25, 34, 0.95);
            border-radius: 12px;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            z-index: 100;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            min-width: 300px;
        }
        .straighten-controls {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 16px;
        }
        .straighten-btn {
            padding: 8px;
            border: none;
            background: transparent;
            color: #9ca3af;
            border-radius: 8px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 13px;
        }
        .straighten-btn:hover {
            background: rgba(255,255,255,0.1);
            color: white;
        }
        .straighten-btn.primary {
            background: #0d7ff2;
            color: white;
            padding: 10px 20px;
        }
        .angle-display {
            background: rgba(0,0,0,0.3);
            padding: 8px 16px;
            border-radius: 8px;
            min-width: 80px;
            text-align: center;
        }
        .angle-value {
            font-size: 18px;
            font-weight: 600;
            color: white;
            font-family: monospace;
        }
        .straighten-slider-container {
            padding: 0 8px;
        }
        .straighten-slider {
            width: 100%;
            height: 6px;
            border-radius: 3px;
            background: linear-gradient(to right,
                #374151 0%, #374151 50%, #374151 100%);
            -webkit-appearance: none;
            position: relative;
        }
        .straighten-slider::before {
            content: '';
            position: absolute;
            left: 50%;
            top: -4px;
            width: 2px;
            height: 14px;
            background: #6b7280;
            transform: translateX(-50%);
        }
        .straighten-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: #0d7ff2;
            cursor: pointer;
            border: 2px solid white;
        }
        .straighten-info {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            color: #6b7280;
            justify-content: center;
        }
        .straighten-info .material-symbols-outlined {
            font-size: 16px;
        }
        .straighten-actions {
            display: flex;
            gap: 8px;
            justify-content: center;
        }
        .straighten-line {
            stroke: #0d7ff2;
            stroke-width: 2;
            stroke-dasharray: 5,5;
        }
    `;
    document.head.appendChild(style);

    /**
     * Draw alignment grid
     */
    function drawGrid(ctx, w, h) {
        ctx.clearRect(0, 0, w, h);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;

        const gridSize = 50;

        // Vertical lines
        for (let x = gridSize; x < w; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }

        // Horizontal lines
        for (let y = gridSize; y < h; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }
    }

    /**
     * Update preview with rotation
     */
    function updatePreview() {
        const angle = currentAngle * Math.PI / 180;
        const cos = Math.abs(Math.cos(angle));
        const sin = Math.abs(Math.sin(angle));

        // Calculate new dimensions
        const newWidth = sourceCanvas.width * cos + sourceCanvas.height * sin;
        const newHeight = sourceCanvas.width * sin + sourceCanvas.height * cos;

        previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

        previewCtx.save();
        previewCtx.translate(previewCanvas.width / 2, previewCanvas.height / 2);
        previewCtx.rotate(angle);
        previewCtx.drawImage(
            sourceCanvas,
            -sourceCanvas.width / 2,
            -sourceCanvas.height / 2
        );
        previewCtx.restore();

        // Update display
        toolbar.querySelector('.angle-value').textContent = `${currentAngle.toFixed(1)}°`;
        toolbar.querySelector('.straighten-slider').value = currentAngle;

        onAngleChange(currentAngle);
    }

    /**
     * Draw alignment line on overlay
     */
    function drawLine() {
        overlayCtx.clearRect(0, 0, overlay.width, overlay.height);

        if (lineStart && lineEnd) {
            overlayCtx.strokeStyle = '#0d7ff2';
            overlayCtx.lineWidth = 2;
            overlayCtx.setLineDash([5, 5]);

            overlayCtx.beginPath();
            overlayCtx.moveTo(lineStart.x, lineStart.y);
            overlayCtx.lineTo(lineEnd.x, lineEnd.y);
            overlayCtx.stroke();

            // Draw end points
            overlayCtx.fillStyle = '#0d7ff2';
            overlayCtx.beginPath();
            overlayCtx.arc(lineStart.x, lineStart.y, 6, 0, Math.PI * 2);
            overlayCtx.fill();
            overlayCtx.beginPath();
            overlayCtx.arc(lineEnd.x, lineEnd.y, 6, 0, Math.PI * 2);
            overlayCtx.fill();
        }
    }

    /**
     * Calculate angle from line
     */
    function calculateAngleFromLine() {
        if (!lineStart || !lineEnd) return;

        const dx = lineEnd.x - lineStart.x;
        const dy = lineEnd.y - lineStart.y;
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;

        // We want to make this line horizontal
        currentAngle = -angle;
        currentAngle = Math.max(-maxAngle, Math.min(maxAngle, currentAngle));

        updatePreview();
    }

    /**
     * Auto-detect horizon/edges (simple edge detection)
     */
    function autoStraighten() {
        const ctx = sourceCanvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
        const data = imageData.data;
        const width = sourceCanvas.width;
        const height = sourceCanvas.height;

        // Simple Hough transform for dominant lines
        // This is a simplified version - real implementation would be more complex
        const angles = [];

        // Sample edge pixels using Sobel-like detection
        for (let y = 1; y < height - 1; y += 10) {
            for (let x = 1; x < width - 1; x += 10) {
                const idx = (y * width + x) * 4;

                // Horizontal gradient
                const gx = (
                    -data[(y - 1) * width * 4 + (x - 1) * 4] +
                    data[(y - 1) * width * 4 + (x + 1) * 4] +
                    -2 * data[y * width * 4 + (x - 1) * 4] +
                    2 * data[y * width * 4 + (x + 1) * 4] +
                    -data[(y + 1) * width * 4 + (x - 1) * 4] +
                    data[(y + 1) * width * 4 + (x + 1) * 4]
                );

                // Vertical gradient
                const gy = (
                    -data[(y - 1) * width * 4 + (x - 1) * 4] +
                    -2 * data[(y - 1) * width * 4 + x * 4] +
                    -data[(y - 1) * width * 4 + (x + 1) * 4] +
                    data[(y + 1) * width * 4 + (x - 1) * 4] +
                    2 * data[(y + 1) * width * 4 + x * 4] +
                    data[(y + 1) * width * 4 + (x + 1) * 4]
                );

                const magnitude = Math.sqrt(gx * gx + gy * gy);
                if (magnitude > 100) {
                    const angle = Math.atan2(gy, gx) * 180 / Math.PI;
                    // Only consider near-horizontal lines
                    if (Math.abs(angle) < 15 || Math.abs(angle - 180) < 15 || Math.abs(angle + 180) < 15) {
                        angles.push(angle > 90 ? angle - 180 : (angle < -90 ? angle + 180 : angle));
                    }
                }
            }
        }

        if (angles.length > 0) {
            // Find median angle
            angles.sort((a, b) => a - b);
            const medianAngle = angles[Math.floor(angles.length / 2)];
            currentAngle = -medianAngle;
            currentAngle = Math.max(-maxAngle, Math.min(maxAngle, currentAngle));
            updatePreview();
        }
    }

    // Event handlers
    function getPoint(e) {
        const rect = overlay.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: (clientX - rect.left) * (overlay.width / rect.width),
            y: (clientY - rect.top) * (overlay.height / rect.height)
        };
    }

    function handleStart(e) {
        isDrawingLine = true;
        lineStart = getPoint(e);
        lineEnd = null;
    }

    function handleMove(e) {
        if (!isDrawingLine) return;
        lineEnd = getPoint(e);
        drawLine();
    }

    function handleEnd() {
        if (isDrawingLine && lineStart && lineEnd) {
            calculateAngleFromLine();
        }
        isDrawingLine = false;
    }

    // Overlay events
    overlay.addEventListener('mousedown', handleStart);
    overlay.addEventListener('mousemove', handleMove);
    overlay.addEventListener('mouseup', handleEnd);
    overlay.addEventListener('mouseleave', handleEnd);
    overlay.addEventListener('touchstart', handleStart, { passive: true });
    overlay.addEventListener('touchmove', handleMove, { passive: true });
    overlay.addEventListener('touchend', handleEnd);

    // Toolbar events
    toolbar.querySelector('.rotate-left').addEventListener('click', () => {
        currentAngle = Math.max(-maxAngle, currentAngle - 0.5);
        updatePreview();
    });

    toolbar.querySelector('.rotate-right').addEventListener('click', () => {
        currentAngle = Math.min(maxAngle, currentAngle + 0.5);
        updatePreview();
    });

    toolbar.querySelector('.straighten-slider').addEventListener('input', (e) => {
        currentAngle = parseFloat(e.target.value);
        updatePreview();
    });

    toolbar.querySelector('.auto-btn').addEventListener('click', autoStraighten);

    toolbar.querySelector('.reset-btn').addEventListener('click', () => {
        currentAngle = 0;
        lineStart = null;
        lineEnd = null;
        overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
        updatePreview();
    });

    toolbar.querySelector('.apply-btn').addEventListener('click', () => {
        onApply(getResult());
    });

    /**
     * Get rotated result canvas
     */
    function getResult() {
        const angle = currentAngle * Math.PI / 180;

        // Calculate crop area after rotation
        const cos = Math.abs(Math.cos(angle));
        const sin = Math.abs(Math.sin(angle));

        const result = document.createElement('canvas');
        result.width = sourceCanvas.width;
        result.height = sourceCanvas.height;
        const ctx = result.getContext('2d');

        ctx.translate(result.width / 2, result.height / 2);
        ctx.rotate(angle);
        ctx.drawImage(sourceCanvas, -sourceCanvas.width / 2, -sourceCanvas.height / 2);

        return result;
    }

    // Initial preview
    updatePreview();

    // Append to container
    if (container) {
        container.style.position = 'relative';
        container.appendChild(previewCanvas);
        container.appendChild(gridCanvas);
        container.appendChild(overlay);
        container.appendChild(toolbar);
    }

    return {
        previewCanvas,
        overlay,
        toolbar,
        getAngle() {
            return currentAngle;
        },
        setAngle(angle) {
            currentAngle = Math.max(-maxAngle, Math.min(maxAngle, angle));
            updatePreview();
        },
        reset() {
            currentAngle = 0;
            lineStart = null;
            lineEnd = null;
            overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
            updatePreview();
        },
        autoStraighten,
        getResult,
        destroy() {
            previewCanvas.remove();
            gridCanvas.remove();
            overlay.remove();
            toolbar.remove();
            style.remove();
        }
    };
}

/**
 * Apply rotation to canvas
 * @param {HTMLCanvasElement} canvas - Source canvas
 * @param {number} angle - Rotation angle in degrees
 * @returns {HTMLCanvasElement} - Rotated canvas
 */
export function rotateCanvas(canvas, angle) {
    const radians = angle * Math.PI / 180;
    const cos = Math.abs(Math.cos(radians));
    const sin = Math.abs(Math.sin(radians));

    const newWidth = canvas.width * cos + canvas.height * sin;
    const newHeight = canvas.width * sin + canvas.height * cos;

    const result = document.createElement('canvas');
    result.width = newWidth;
    result.height = newHeight;
    const ctx = result.getContext('2d');

    ctx.translate(newWidth / 2, newHeight / 2);
    ctx.rotate(radians);
    ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);

    return result;
}
