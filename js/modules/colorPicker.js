/**
 * Color Picker Tool Module
 * Pick colors from images with magnifier preview
 */

/**
 * Create color picker tool
 * @param {HTMLCanvasElement} canvas - Source canvas
 * @param {Object} options - Configuration options
 * @returns {Object} - Color picker controller
 */
export function createColorPicker(canvas, options = {}) {
    const {
        container,
        onColorPick = () => {},
        onColorHover = () => {},
        magnifierSize = 100,
        zoomLevel = 4
    } = options;

    let isActive = false;
    let currentColor = null;
    let pickedColors = [];

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'color-picker-overlay';
    overlay.style.cssText = `
        position: absolute;
        inset: 0;
        cursor: crosshair;
        z-index: 100;
        display: none;
    `;

    // Create magnifier
    const magnifier = document.createElement('div');
    magnifier.className = 'color-magnifier';
    magnifier.innerHTML = `
        <canvas class="magnifier-canvas"></canvas>
        <div class="magnifier-crosshair"></div>
        <div class="magnifier-info">
            <div class="color-preview"></div>
            <div class="color-values">
                <div class="color-hex">#000000</div>
                <div class="color-rgb">rgb(0, 0, 0)</div>
            </div>
        </div>
    `;

    // Color history panel
    const historyPanel = document.createElement('div');
    historyPanel.className = 'color-history-panel';
    historyPanel.innerHTML = `
        <div class="history-title">Recent Colors</div>
        <div class="history-colors"></div>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .color-magnifier {
            position: fixed;
            width: ${magnifierSize}px;
            height: ${magnifierSize + 60}px;
            background: rgba(16, 25, 34, 0.95);
            border-radius: 12px;
            overflow: hidden;
            pointer-events: none;
            z-index: 1000;
            display: none;
            box-shadow: 0 10px 40px rgba(0,0,0,0.5);
        }
        .magnifier-canvas {
            width: ${magnifierSize}px;
            height: ${magnifierSize}px;
            image-rendering: pixelated;
        }
        .magnifier-crosshair {
            position: absolute;
            top: ${magnifierSize / 2 - 8}px;
            left: ${magnifierSize / 2 - 8}px;
            width: 16px;
            height: 16px;
            border: 2px solid white;
            box-shadow: 0 0 0 1px black;
            pointer-events: none;
        }
        .magnifier-info {
            display: flex;
            padding: 8px;
            gap: 8px;
            align-items: center;
        }
        .color-preview {
            width: 40px;
            height: 40px;
            border-radius: 8px;
            border: 2px solid white;
        }
        .color-values {
            flex: 1;
        }
        .color-hex {
            font-size: 14px;
            font-weight: 600;
            color: white;
            font-family: monospace;
        }
        .color-rgb {
            font-size: 11px;
            color: #9ca3af;
            font-family: monospace;
        }
        .color-history-panel {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(16, 25, 34, 0.95);
            border-radius: 12px;
            padding: 12px;
            display: none;
            z-index: 100;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }
        .history-title {
            font-size: 11px;
            text-transform: uppercase;
            color: #6b7280;
            margin-bottom: 8px;
            letter-spacing: 1px;
        }
        .history-colors {
            display: flex;
            gap: 6px;
        }
        .history-color {
            width: 32px;
            height: 32px;
            border-radius: 6px;
            border: 2px solid transparent;
            cursor: pointer;
            position: relative;
        }
        .history-color:hover {
            border-color: white;
        }
        .history-color::after {
            content: attr(data-hex);
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-family: monospace;
            white-space: nowrap;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.15s;
        }
        .history-color:hover::after {
            opacity: 1;
        }
    `;
    document.head.appendChild(style);

    const magnifierCanvas = magnifier.querySelector('.magnifier-canvas');
    const magnifierCtx = magnifierCanvas.getContext('2d');
    magnifierCanvas.width = magnifierSize * zoomLevel;
    magnifierCanvas.height = magnifierSize * zoomLevel;

    // Get canvas context for color sampling
    const ctx = canvas.getContext('2d');

    /**
     * Get color at pixel position
     * @param {number} x
     * @param {number} y
     * @returns {Object} - Color data
     */
    function getColorAt(x, y) {
        const pixel = ctx.getImageData(x, y, 1, 1).data;
        const r = pixel[0];
        const g = pixel[1];
        const b = pixel[2];
        const a = pixel[3];

        return {
            r, g, b, a,
            hex: rgbToHex(r, g, b),
            rgb: `rgb(${r}, ${g}, ${b})`,
            rgba: `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(2)})`
        };
    }

    /**
     * Update magnifier display
     * @param {number} x - Canvas X
     * @param {number} y - Canvas Y
     * @param {number} clientX - Screen X
     * @param {number} clientY - Screen Y
     */
    function updateMagnifier(x, y, clientX, clientY) {
        // Position magnifier
        let magX = clientX + 20;
        let magY = clientY + 20;

        // Keep on screen
        if (magX + magnifierSize > window.innerWidth) {
            magX = clientX - magnifierSize - 20;
        }
        if (magY + magnifierSize + 60 > window.innerHeight) {
            magY = clientY - magnifierSize - 80;
        }

        magnifier.style.left = `${magX}px`;
        magnifier.style.top = `${magY}px`;

        // Draw magnified area
        const sampleSize = Math.floor(magnifierSize / zoomLevel);
        const halfSample = Math.floor(sampleSize / 2);

        magnifierCtx.imageSmoothingEnabled = false;
        magnifierCtx.clearRect(0, 0, magnifierCanvas.width, magnifierCanvas.height);
        magnifierCtx.drawImage(
            canvas,
            Math.max(0, x - halfSample),
            Math.max(0, y - halfSample),
            sampleSize,
            sampleSize,
            0,
            0,
            magnifierCanvas.width,
            magnifierCanvas.height
        );

        // Get and display color
        const color = getColorAt(Math.floor(x), Math.floor(y));
        currentColor = color;

        magnifier.querySelector('.color-preview').style.background = color.hex;
        magnifier.querySelector('.color-hex').textContent = color.hex;
        magnifier.querySelector('.color-rgb').textContent = color.rgb;

        onColorHover(color);
    }

    /**
     * Update color history display
     */
    function updateHistory() {
        const historyColors = historyPanel.querySelector('.history-colors');
        historyColors.innerHTML = pickedColors.slice(-10).reverse().map(color => `
            <div class="history-color" style="background: ${color.hex}" data-hex="${color.hex}"></div>
        `).join('');

        // Attach click handlers
        historyColors.querySelectorAll('.history-color').forEach(el => {
            el.addEventListener('click', () => {
                const color = pickedColors.find(c => c.hex === el.dataset.hex);
                if (color) {
                    onColorPick(color);
                    copyToClipboard(color.hex);
                }
            });
        });
    }

    // Event handlers
    function handleMouseMove(e) {
        if (!isActive) return;

        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);

        updateMagnifier(x, y, e.clientX, e.clientY);
    }

    function handleClick(e) {
        if (!isActive || !currentColor) return;

        // Add to history
        if (!pickedColors.some(c => c.hex === currentColor.hex)) {
            pickedColors.push({ ...currentColor });
            updateHistory();
        }

        onColorPick(currentColor);
        copyToClipboard(currentColor.hex);

        // Show feedback
        showCopyFeedback(e.clientX, e.clientY);
    }

    // Attach to overlay
    overlay.addEventListener('mousemove', handleMouseMove);
    overlay.addEventListener('click', handleClick);

    // Append elements
    if (container) {
        container.style.position = 'relative';
        container.appendChild(overlay);
    }
    document.body.appendChild(magnifier);
    document.body.appendChild(historyPanel);

    return {
        activate() {
            isActive = true;
            overlay.style.display = 'block';
            magnifier.style.display = 'block';
            historyPanel.style.display = 'block';
            updateHistory();
        },
        deactivate() {
            isActive = false;
            overlay.style.display = 'none';
            magnifier.style.display = 'none';
            historyPanel.style.display = 'none';
        },
        toggle() {
            if (isActive) {
                this.deactivate();
            } else {
                this.activate();
            }
        },
        isActive() {
            return isActive;
        },
        getCurrentColor() {
            return currentColor;
        },
        getHistory() {
            return [...pickedColors];
        },
        clearHistory() {
            pickedColors = [];
            updateHistory();
        },
        destroy() {
            overlay.remove();
            magnifier.remove();
            historyPanel.remove();
            style.remove();
        }
    };
}

/**
 * Convert RGB to HEX
 */
function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
    } catch (err) {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    }
}

/**
 * Show copy feedback
 */
function showCopyFeedback(x, y) {
    const feedback = document.createElement('div');
    feedback.textContent = 'Copied!';
    feedback.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        background: #10b981;
        color: white;
        padding: 8px 16px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 500;
        z-index: 10000;
        pointer-events: none;
        animation: fadeUp 0.5s ease forwards;
    `;

    // Add animation if not exists
    if (!document.getElementById('copy-feedback-style')) {
        const style = document.createElement('style');
        style.id = 'copy-feedback-style';
        style.textContent = `
            @keyframes fadeUp {
                from { opacity: 1; transform: translateY(0); }
                to { opacity: 0; transform: translateY(-20px); }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(feedback);
    setTimeout(() => feedback.remove(), 500);
}

/**
 * Get dominant colors from canvas
 * @param {HTMLCanvasElement} canvas
 * @param {number} count - Number of colors to return
 * @returns {Array} - Array of color objects
 */
export function getDominantColors(canvas, count = 5) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Simple color quantization using buckets
    const colorMap = new Map();
    const bucketSize = 24; // Group similar colors

    for (let i = 0; i < data.length; i += 16) { // Sample every 4th pixel
        const r = Math.floor(data[i] / bucketSize) * bucketSize;
        const g = Math.floor(data[i + 1] / bucketSize) * bucketSize;
        const b = Math.floor(data[i + 2] / bucketSize) * bucketSize;
        const a = data[i + 3];

        if (a < 128) continue; // Skip transparent pixels

        const key = `${r},${g},${b}`;
        colorMap.set(key, (colorMap.get(key) || 0) + 1);
    }

    // Sort by frequency and get top colors
    const sorted = Array.from(colorMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, count);

    return sorted.map(([key]) => {
        const [r, g, b] = key.split(',').map(Number);
        return {
            r, g, b,
            hex: rgbToHex(r, g, b),
            rgb: `rgb(${r}, ${g}, ${b})`
        };
    });
}
