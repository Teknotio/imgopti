/**
 * Image Adjustments Module
 * Brightness, Contrast, Saturation, and other adjustments
 */

/**
 * Default adjustment values
 */
export const DEFAULT_ADJUSTMENTS = {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    exposure: 0,
    highlights: 0,
    shadows: 0,
    temperature: 0,
    tint: 0,
    vibrance: 0,
    clarity: 0,
    sharpness: 0,
    vignette: 0
};

/**
 * Adjustment ranges for UI sliders
 */
export const ADJUSTMENT_RANGES = {
    brightness: { min: 0, max: 200, step: 1, unit: '%' },
    contrast: { min: 0, max: 200, step: 1, unit: '%' },
    saturation: { min: 0, max: 200, step: 1, unit: '%' },
    exposure: { min: -100, max: 100, step: 1, unit: '' },
    highlights: { min: -100, max: 100, step: 1, unit: '' },
    shadows: { min: -100, max: 100, step: 1, unit: '' },
    temperature: { min: -100, max: 100, step: 1, unit: '' },
    tint: { min: -100, max: 100, step: 1, unit: '' },
    vibrance: { min: -100, max: 100, step: 1, unit: '' },
    clarity: { min: 0, max: 100, step: 1, unit: '' },
    sharpness: { min: 0, max: 100, step: 1, unit: '' },
    vignette: { min: 0, max: 100, step: 1, unit: '' }
};

/**
 * Apply adjustments to canvas
 * @param {HTMLCanvasElement} sourceCanvas - Source canvas
 * @param {Object} adjustments - Adjustment values
 * @returns {HTMLCanvasElement} - New canvas with adjustments applied
 */
export function applyAdjustments(sourceCanvas, adjustments) {
    const canvas = document.createElement('canvas');
    canvas.width = sourceCanvas.width;
    canvas.height = sourceCanvas.height;
    const ctx = canvas.getContext('2d');

    // Draw source image
    ctx.drawImage(sourceCanvas, 0, 0);

    // Get image data for pixel manipulation
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Apply pixel-level adjustments
    for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // Apply exposure
        if (adjustments.exposure !== 0) {
            const exposure = 1 + (adjustments.exposure / 100);
            r *= exposure;
            g *= exposure;
            b *= exposure;
        }

        // Apply temperature (warm/cool)
        if (adjustments.temperature !== 0) {
            const temp = adjustments.temperature / 100;
            r += temp * 30;
            b -= temp * 30;
        }

        // Apply tint (green/magenta)
        if (adjustments.tint !== 0) {
            const tint = adjustments.tint / 100;
            g += tint * 30;
        }

        // Apply highlights adjustment
        if (adjustments.highlights !== 0) {
            const luminance = (r + g + b) / 3;
            if (luminance > 128) {
                const factor = (luminance - 128) / 127;
                const adjustment = (adjustments.highlights / 100) * factor * 50;
                r += adjustment;
                g += adjustment;
                b += adjustment;
            }
        }

        // Apply shadows adjustment
        if (adjustments.shadows !== 0) {
            const luminance = (r + g + b) / 3;
            if (luminance < 128) {
                const factor = (128 - luminance) / 128;
                const adjustment = (adjustments.shadows / 100) * factor * 50;
                r += adjustment;
                g += adjustment;
                b += adjustment;
            }
        }

        // Apply vibrance (smart saturation - affects less saturated colors more)
        if (adjustments.vibrance !== 0) {
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const saturation = max === 0 ? 0 : (max - min) / max;
            const vibranceFactor = (1 - saturation) * (adjustments.vibrance / 100);
            const avg = (r + g + b) / 3;
            r += (r - avg) * vibranceFactor;
            g += (g - avg) * vibranceFactor;
            b += (b - avg) * vibranceFactor;
        }

        // Clamp values
        data[i] = Math.max(0, Math.min(255, Math.round(r)));
        data[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
        data[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
    }

    ctx.putImageData(imageData, 0, 0);

    // Apply CSS filter-based adjustments
    const filterCanvas = document.createElement('canvas');
    filterCanvas.width = canvas.width;
    filterCanvas.height = canvas.height;
    const filterCtx = filterCanvas.getContext('2d');

    // Build filter string
    const filters = [];
    if (adjustments.brightness !== 100) {
        filters.push(`brightness(${adjustments.brightness}%)`);
    }
    if (adjustments.contrast !== 100) {
        filters.push(`contrast(${adjustments.contrast}%)`);
    }
    if (adjustments.saturation !== 100) {
        filters.push(`saturate(${adjustments.saturation}%)`);
    }

    filterCtx.filter = filters.length > 0 ? filters.join(' ') : 'none';
    filterCtx.drawImage(canvas, 0, 0);

    // Apply clarity (local contrast enhancement)
    if (adjustments.clarity > 0) {
        applyClarity(filterCanvas, adjustments.clarity);
    }

    // Apply sharpness
    if (adjustments.sharpness > 0) {
        applySharpness(filterCanvas, adjustments.sharpness);
    }

    // Apply vignette
    if (adjustments.vignette > 0) {
        applyVignette(filterCanvas, adjustments.vignette);
    }

    return filterCanvas;
}

/**
 * Apply clarity (local contrast) to canvas
 * @param {HTMLCanvasElement} canvas
 * @param {number} amount - 0 to 100
 */
function applyClarity(canvas, amount) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = canvas.width;
    const height = canvas.height;

    // Simple unsharp mask for clarity
    const strength = amount / 200;
    const tempData = new Uint8ClampedArray(data);

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4;

            for (let c = 0; c < 3; c++) {
                // 3x3 average
                let sum = 0;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const nidx = ((y + dy) * width + (x + dx)) * 4 + c;
                        sum += tempData[nidx];
                    }
                }
                const avg = sum / 9;
                const diff = tempData[idx + c] - avg;
                data[idx + c] = Math.max(0, Math.min(255, tempData[idx + c] + diff * strength));
            }
        }
    }

    ctx.putImageData(imageData, 0, 0);
}

/**
 * Apply sharpness to canvas
 * @param {HTMLCanvasElement} canvas
 * @param {number} amount - 0 to 100
 */
function applySharpness(canvas, amount) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = canvas.width;
    const height = canvas.height;

    const strength = amount / 50;
    const tempData = new Uint8ClampedArray(data);

    // Unsharp mask kernel
    const kernel = [
        0, -1, 0,
        -1, 5, -1,
        0, -1, 0
    ];

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4;

            for (let c = 0; c < 3; c++) {
                let sum = 0;
                let ki = 0;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const nidx = ((y + dy) * width + (x + dx)) * 4 + c;
                        sum += tempData[nidx] * kernel[ki++];
                    }
                }
                const sharpened = tempData[idx + c] + (sum - tempData[idx + c]) * strength;
                data[idx + c] = Math.max(0, Math.min(255, sharpened));
            }
        }
    }

    ctx.putImageData(imageData, 0, 0);
}

/**
 * Apply vignette effect to canvas
 * @param {HTMLCanvasElement} canvas
 * @param {number} amount - 0 to 100
 */
function applyVignette(canvas, amount) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.sqrt(centerX * centerX + centerY * centerY);

    // Create radial gradient for vignette
    const gradient = ctx.createRadialGradient(
        centerX, centerY, radius * 0.3,
        centerX, centerY, radius
    );

    const darkness = amount / 100;
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, `rgba(0,0,0,${darkness * 0.7})`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
}

/**
 * Get real-time preview filter string for CSS
 * @param {Object} adjustments - Adjustment values
 * @returns {string} - CSS filter string
 */
export function getPreviewFilter(adjustments) {
    const filters = [];

    if (adjustments.brightness !== 100) {
        filters.push(`brightness(${adjustments.brightness}%)`);
    }
    if (adjustments.contrast !== 100) {
        filters.push(`contrast(${adjustments.contrast}%)`);
    }
    if (adjustments.saturation !== 100) {
        filters.push(`saturate(${adjustments.saturation}%)`);
    }

    return filters.length > 0 ? filters.join(' ') : 'none';
}

/**
 * Create adjustment UI panel
 * @param {Object} options - Configuration options
 * @returns {Object} - Adjustment panel controller
 */
export function createAdjustmentPanel(options = {}) {
    const {
        container,
        initialValues = {},
        onChange = () => {},
        onReset = () => {}
    } = options;

    let currentValues = { ...DEFAULT_ADJUSTMENTS, ...initialValues };

    // Create panel HTML
    const panel = document.createElement('div');
    panel.className = 'adjustment-panel';
    panel.innerHTML = `
        <div class="adjustment-header">
            <span>Adjustments</span>
            <button class="reset-adjustments" title="Reset all">
                <span class="material-symbols-outlined">restart_alt</span>
            </button>
        </div>
        <div class="adjustment-sliders">
            ${createSliderHTML('brightness', 'Brightness', currentValues.brightness)}
            ${createSliderHTML('contrast', 'Contrast', currentValues.contrast)}
            ${createSliderHTML('saturation', 'Saturation', currentValues.saturation)}
            ${createSliderHTML('exposure', 'Exposure', currentValues.exposure)}
            ${createSliderHTML('highlights', 'Highlights', currentValues.highlights)}
            ${createSliderHTML('shadows', 'Shadows', currentValues.shadows)}
            ${createSliderHTML('temperature', 'Temperature', currentValues.temperature)}
            ${createSliderHTML('vibrance', 'Vibrance', currentValues.vibrance)}
            ${createSliderHTML('clarity', 'Clarity', currentValues.clarity)}
            ${createSliderHTML('sharpness', 'Sharpness', currentValues.sharpness)}
            ${createSliderHTML('vignette', 'Vignette', currentValues.vignette)}
        </div>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .adjustment-panel {
            background: rgba(16, 25, 34, 0.95);
            border-radius: 12px;
            padding: 16px;
            width: 280px;
        }
        .adjustment-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            font-weight: 600;
            color: white;
        }
        .reset-adjustments {
            background: transparent;
            border: none;
            color: #6b7280;
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
        }
        .reset-adjustments:hover {
            background: rgba(255,255,255,0.1);
            color: white;
        }
        .adjustment-sliders {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .adjustment-slider {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        .adjustment-slider-header {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            color: #9ca3af;
        }
        .adjustment-slider-value {
            font-weight: 500;
            color: white;
            min-width: 40px;
            text-align: right;
        }
        .adjustment-slider input[type="range"] {
            width: 100%;
            height: 4px;
            border-radius: 2px;
            background: #374151;
            outline: none;
            -webkit-appearance: none;
        }
        .adjustment-slider input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: #0d7ff2;
            cursor: pointer;
            border: 2px solid white;
        }
        .adjustment-slider input[type="range"]::-moz-range-thumb {
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: #0d7ff2;
            cursor: pointer;
            border: 2px solid white;
        }
    `;
    document.head.appendChild(style);

    // Setup event listeners
    const sliders = panel.querySelectorAll('input[type="range"]');
    sliders.forEach(slider => {
        slider.addEventListener('input', (e) => {
            const name = e.target.dataset.adjustment;
            const value = parseFloat(e.target.value);
            currentValues[name] = value;

            // Update display value
            const valueDisplay = panel.querySelector(`[data-value="${name}"]`);
            if (valueDisplay) {
                const range = ADJUSTMENT_RANGES[name];
                valueDisplay.textContent = value + (range.unit || '');
            }

            onChange(currentValues);
        });
    });

    // Reset button
    const resetBtn = panel.querySelector('.reset-adjustments');
    resetBtn.addEventListener('click', () => {
        currentValues = { ...DEFAULT_ADJUSTMENTS };
        sliders.forEach(slider => {
            const name = slider.dataset.adjustment;
            slider.value = DEFAULT_ADJUSTMENTS[name];
            const valueDisplay = panel.querySelector(`[data-value="${name}"]`);
            if (valueDisplay) {
                const range = ADJUSTMENT_RANGES[name];
                valueDisplay.textContent = DEFAULT_ADJUSTMENTS[name] + (range.unit || '');
            }
        });
        onChange(currentValues);
        onReset();
    });

    // Append to container
    if (container) {
        container.appendChild(panel);
    }

    return {
        element: panel,
        getValues() {
            return { ...currentValues };
        },
        setValues(values) {
            currentValues = { ...currentValues, ...values };
            sliders.forEach(slider => {
                const name = slider.dataset.adjustment;
                if (values[name] !== undefined) {
                    slider.value = values[name];
                    const valueDisplay = panel.querySelector(`[data-value="${name}"]`);
                    if (valueDisplay) {
                        const range = ADJUSTMENT_RANGES[name];
                        valueDisplay.textContent = values[name] + (range.unit || '');
                    }
                }
            });
        },
        reset() {
            resetBtn.click();
        },
        destroy() {
            panel.remove();
            style.remove();
        }
    };
}

/**
 * Helper to create slider HTML
 */
function createSliderHTML(name, label, value) {
    const range = ADJUSTMENT_RANGES[name];
    return `
        <div class="adjustment-slider">
            <div class="adjustment-slider-header">
                <span>${label}</span>
                <span class="adjustment-slider-value" data-value="${name}">${value}${range.unit}</span>
            </div>
            <input type="range"
                   data-adjustment="${name}"
                   min="${range.min}"
                   max="${range.max}"
                   step="${range.step}"
                   value="${value}">
        </div>
    `;
}
