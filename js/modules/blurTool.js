/**
 * Blur/Pixelate Tool Module
 * Selective blur and pixelation for regions
 */

/**
 * Blur modes
 */
export const BLUR_MODES = {
    gaussian: { label: 'Gaussian Blur', icon: 'blur_on' },
    pixelate: { label: 'Pixelate', icon: 'grid_view' },
    mosaic: { label: 'Mosaic', icon: 'apps' }
};

/**
 * Create blur tool overlay
 * @param {HTMLCanvasElement} sourceCanvas - Source canvas to blur
 * @param {Object} options - Configuration options
 * @returns {Object} - Blur tool controller
 */
export function createBlurTool(sourceCanvas, options = {}) {
    const {
        container,
        mode = 'gaussian',
        intensity = 10,
        brushSize = 50,
        onApply = () => {}
    } = options;

    let currentMode = mode;
    let currentIntensity = intensity;
    let currentBrushSize = brushSize;
    let isDrawing = false;
    let regions = [];

    // Create overlay canvas
    const overlay = document.createElement('canvas');
    overlay.width = sourceCanvas.width;
    overlay.height = sourceCanvas.height;
    overlay.className = 'blur-overlay';
    overlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        cursor: crosshair;
        z-index: 60;
    `;

    const ctx = overlay.getContext('2d');

    // Create mask canvas (tracks blurred areas)
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = sourceCanvas.width;
    maskCanvas.height = sourceCanvas.height;
    const maskCtx = maskCanvas.getContext('2d');

    // Working canvas for blur effect
    const workCanvas = document.createElement('canvas');
    workCanvas.width = sourceCanvas.width;
    workCanvas.height = sourceCanvas.height;
    const workCtx = workCanvas.getContext('2d');

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .blur-toolbar {
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(16, 25, 34, 0.95);
            border-radius: 12px;
            padding: 12px 16px;
            display: flex;
            align-items: center;
            gap: 16px;
            z-index: 100;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }
        .blur-mode-btn {
            padding: 8px 12px;
            border: none;
            background: transparent;
            color: #9ca3af;
            border-radius: 8px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 13px;
            transition: all 0.15s;
        }
        .blur-mode-btn:hover {
            background: rgba(255,255,255,0.1);
            color: white;
        }
        .blur-mode-btn.active {
            background: #0d7ff2;
            color: white;
        }
        .blur-slider-group {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        .blur-slider-label {
            font-size: 11px;
            color: #6b7280;
        }
        .blur-slider {
            width: 100px;
            height: 4px;
            border-radius: 2px;
            background: #374151;
            -webkit-appearance: none;
        }
        .blur-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: white;
            cursor: pointer;
        }
        .blur-actions {
            display: flex;
            gap: 8px;
            padding-left: 16px;
            border-left: 1px solid rgba(255,255,255,0.1);
        }
        .blur-action-btn {
            padding: 8px 16px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
        }
        .blur-action-btn.primary {
            background: #0d7ff2;
            color: white;
        }
        .blur-action-btn.secondary {
            background: transparent;
            color: #9ca3af;
            border: 1px solid rgba(255,255,255,0.2);
        }
        .blur-action-btn:hover {
            opacity: 0.9;
        }
        .brush-preview {
            position: fixed;
            border: 2px solid rgba(255,255,255,0.5);
            border-radius: 50%;
            pointer-events: none;
            z-index: 1000;
        }
    `;
    document.head.appendChild(style);

    // Create toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'blur-toolbar';
    toolbar.innerHTML = `
        ${Object.entries(BLUR_MODES).map(([key, mode]) => `
            <button class="blur-mode-btn ${key === currentMode ? 'active' : ''}" data-mode="${key}">
                <span class="material-symbols-outlined">${mode.icon}</span>
                ${mode.label}
            </button>
        `).join('')}
        <div class="blur-slider-group">
            <span class="blur-slider-label">Intensity: ${currentIntensity}</span>
            <input type="range" class="blur-slider intensity-slider" min="1" max="30" value="${currentIntensity}">
        </div>
        <div class="blur-slider-group">
            <span class="blur-slider-label">Brush: ${currentBrushSize}px</span>
            <input type="range" class="blur-slider brush-slider" min="10" max="200" value="${currentBrushSize}">
        </div>
        <div class="blur-actions">
            <button class="blur-action-btn secondary clear-btn">Clear</button>
            <button class="blur-action-btn primary apply-btn">Apply</button>
        </div>
    `;

    // Brush preview
    const brushPreview = document.createElement('div');
    brushPreview.className = 'brush-preview';
    brushPreview.style.width = `${currentBrushSize}px`;
    brushPreview.style.height = `${currentBrushSize}px`;
    brushPreview.style.display = 'none';

    /**
     * Apply blur effect to a region
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} radius - Brush radius
     */
    function applyBlurAtPoint(x, y, radius) {
        // Mark region in mask
        maskCtx.beginPath();
        maskCtx.arc(x, y, radius, 0, Math.PI * 2);
        maskCtx.fillStyle = 'white';
        maskCtx.fill();

        regions.push({ x, y, radius, mode: currentMode, intensity: currentIntensity });
        renderBlur();
    }

    /**
     * Render the blur effect
     */
    function renderBlur() {
        // Clear overlay
        ctx.clearRect(0, 0, overlay.width, overlay.height);

        // Copy source to work canvas
        workCtx.drawImage(sourceCanvas, 0, 0);

        // Apply blur to work canvas based on mode
        if (currentMode === 'gaussian') {
            workCtx.filter = `blur(${currentIntensity}px)`;
            workCtx.drawImage(sourceCanvas, 0, 0);
            workCtx.filter = 'none';
        } else if (currentMode === 'pixelate') {
            pixelateCanvas(workCtx, sourceCanvas, currentIntensity);
        } else if (currentMode === 'mosaic') {
            mosaicCanvas(workCtx, sourceCanvas, currentIntensity);
        }

        // Composite: use mask to show blurred areas
        ctx.save();
        ctx.drawImage(maskCanvas, 0, 0);
        ctx.globalCompositeOperation = 'source-in';
        ctx.drawImage(workCanvas, 0, 0);
        ctx.restore();
    }

    /**
     * Pixelate canvas
     */
    function pixelateCanvas(ctx, source, size) {
        const w = source.width;
        const h = source.height;
        const pixelSize = Math.max(2, size);

        // Draw small
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(source, 0, 0, w / pixelSize, h / pixelSize);
        // Draw back large
        ctx.drawImage(ctx.canvas, 0, 0, w / pixelSize, h / pixelSize, 0, 0, w, h);
        ctx.imageSmoothingEnabled = true;
    }

    /**
     * Mosaic effect (colored squares)
     */
    function mosaicCanvas(ctx, source, size) {
        const w = source.width;
        const h = source.height;
        const tileSize = Math.max(4, size * 2);

        // Get source data
        const tempCtx = document.createElement('canvas').getContext('2d');
        tempCtx.canvas.width = w;
        tempCtx.canvas.height = h;
        tempCtx.drawImage(source, 0, 0);
        const imageData = tempCtx.getImageData(0, 0, w, h);
        const data = imageData.data;

        ctx.clearRect(0, 0, w, h);

        for (let y = 0; y < h; y += tileSize) {
            for (let x = 0; x < w; x += tileSize) {
                // Sample center of tile
                const cx = Math.min(x + tileSize / 2, w - 1);
                const cy = Math.min(y + tileSize / 2, h - 1);
                const idx = (Math.floor(cy) * w + Math.floor(cx)) * 4;

                ctx.fillStyle = `rgb(${data[idx]}, ${data[idx + 1]}, ${data[idx + 2]})`;
                ctx.fillRect(x, y, tileSize, tileSize);
            }
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
        e.preventDefault();
        isDrawing = true;
        const point = getPoint(e);
        applyBlurAtPoint(point.x, point.y, currentBrushSize / 2);
    }

    function handleMove(e) {
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        // Update brush preview
        brushPreview.style.left = `${clientX - currentBrushSize / 2}px`;
        brushPreview.style.top = `${clientY - currentBrushSize / 2}px`;

        if (!isDrawing) return;
        e.preventDefault();

        const point = getPoint(e);
        applyBlurAtPoint(point.x, point.y, currentBrushSize / 2);
    }

    function handleEnd() {
        isDrawing = false;
    }

    // Setup canvas events
    overlay.addEventListener('mousedown', handleStart);
    overlay.addEventListener('mousemove', handleMove);
    overlay.addEventListener('mouseup', handleEnd);
    overlay.addEventListener('mouseleave', handleEnd);
    overlay.addEventListener('touchstart', handleStart, { passive: false });
    overlay.addEventListener('touchmove', handleMove, { passive: false });
    overlay.addEventListener('touchend', handleEnd);

    overlay.addEventListener('mouseenter', () => {
        brushPreview.style.display = 'block';
    });
    overlay.addEventListener('mouseleave', () => {
        brushPreview.style.display = 'none';
    });

    // Toolbar events
    toolbar.querySelectorAll('.blur-mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            toolbar.querySelectorAll('.blur-mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMode = btn.dataset.mode;
            renderBlur();
        });
    });

    toolbar.querySelector('.intensity-slider').addEventListener('input', (e) => {
        currentIntensity = parseInt(e.target.value);
        e.target.previousElementSibling.textContent = `Intensity: ${currentIntensity}`;
        renderBlur();
    });

    toolbar.querySelector('.brush-slider').addEventListener('input', (e) => {
        currentBrushSize = parseInt(e.target.value);
        e.target.previousElementSibling.textContent = `Brush: ${currentBrushSize}px`;
        brushPreview.style.width = `${currentBrushSize}px`;
        brushPreview.style.height = `${currentBrushSize}px`;
    });

    toolbar.querySelector('.clear-btn').addEventListener('click', () => {
        maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
        regions = [];
        renderBlur();
    });

    toolbar.querySelector('.apply-btn').addEventListener('click', () => {
        // Merge blur onto source
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = sourceCanvas.width;
        finalCanvas.height = sourceCanvas.height;
        const finalCtx = finalCanvas.getContext('2d');

        finalCtx.drawImage(sourceCanvas, 0, 0);
        finalCtx.drawImage(overlay, 0, 0);

        onApply(finalCanvas);
    });

    // Append to container
    if (container) {
        container.style.position = 'relative';
        container.appendChild(overlay);
        container.appendChild(toolbar);
        document.body.appendChild(brushPreview);
    }

    return {
        overlay,
        toolbar,
        getRegions() {
            return [...regions];
        },
        setMode(mode) {
            if (BLUR_MODES[mode]) {
                currentMode = mode;
                toolbar.querySelectorAll('.blur-mode-btn').forEach(b => {
                    b.classList.toggle('active', b.dataset.mode === mode);
                });
                renderBlur();
            }
        },
        setIntensity(value) {
            currentIntensity = Math.max(1, Math.min(30, value));
            toolbar.querySelector('.intensity-slider').value = currentIntensity;
            renderBlur();
        },
        setBrushSize(value) {
            currentBrushSize = Math.max(10, Math.min(200, value));
            toolbar.querySelector('.brush-slider').value = currentBrushSize;
            brushPreview.style.width = `${currentBrushSize}px`;
            brushPreview.style.height = `${currentBrushSize}px`;
        },
        clear() {
            maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
            regions = [];
            renderBlur();
        },
        getResult() {
            const finalCanvas = document.createElement('canvas');
            finalCanvas.width = sourceCanvas.width;
            finalCanvas.height = sourceCanvas.height;
            const finalCtx = finalCanvas.getContext('2d');
            finalCtx.drawImage(sourceCanvas, 0, 0);
            finalCtx.drawImage(overlay, 0, 0);
            return finalCanvas;
        },
        destroy() {
            overlay.remove();
            toolbar.remove();
            brushPreview.remove();
            style.remove();
        }
    };
}

/**
 * Apply blur to entire canvas
 * @param {HTMLCanvasElement} canvas
 * @param {string} mode - 'gaussian', 'pixelate', 'mosaic'
 * @param {number} intensity
 * @returns {HTMLCanvasElement}
 */
export function applyFullBlur(canvas, mode = 'gaussian', intensity = 10) {
    const result = document.createElement('canvas');
    result.width = canvas.width;
    result.height = canvas.height;
    const ctx = result.getContext('2d');

    if (mode === 'gaussian') {
        ctx.filter = `blur(${intensity}px)`;
        ctx.drawImage(canvas, 0, 0);
        ctx.filter = 'none';
    } else if (mode === 'pixelate') {
        const pixelSize = Math.max(2, intensity);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(canvas, 0, 0, canvas.width / pixelSize, canvas.height / pixelSize);
        ctx.drawImage(result, 0, 0, canvas.width / pixelSize, canvas.height / pixelSize,
                      0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = true;
    } else if (mode === 'mosaic') {
        const tileSize = Math.max(4, intensity * 2);
        const tempCtx = document.createElement('canvas').getContext('2d');
        tempCtx.canvas.width = canvas.width;
        tempCtx.canvas.height = canvas.height;
        tempCtx.drawImage(canvas, 0, 0);
        const imageData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let y = 0; y < canvas.height; y += tileSize) {
            for (let x = 0; x < canvas.width; x += tileSize) {
                const cx = Math.min(x + tileSize / 2, canvas.width - 1);
                const cy = Math.min(y + tileSize / 2, canvas.height - 1);
                const idx = (Math.floor(cy) * canvas.width + Math.floor(cx)) * 4;
                ctx.fillStyle = `rgb(${data[idx]}, ${data[idx + 1]}, ${data[idx + 2]})`;
                ctx.fillRect(x, y, tileSize, tileSize);
            }
        }
    }

    return result;
}
