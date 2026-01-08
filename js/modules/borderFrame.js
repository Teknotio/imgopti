/**
 * Border/Frame Options Module
 * Add borders, frames, and decorative edges to images
 */

/**
 * Border presets
 */
export const BORDER_PRESETS = {
    none: { label: 'None', width: 0 },
    thin: { label: 'Thin', width: 2 },
    medium: { label: 'Medium', width: 5 },
    thick: { label: 'Thick', width: 10 },
    bold: { label: 'Bold', width: 20 },
    wide: { label: 'Wide', width: 40 }
};

/**
 * Frame styles
 */
export const FRAME_STYLES = {
    solid: { label: 'Solid', icon: 'crop_square' },
    double: { label: 'Double', icon: 'filter_none' },
    groove: { label: 'Groove', icon: 'crop_din' },
    polaroid: { label: 'Polaroid', icon: 'photo' },
    shadow: { label: 'Shadow', icon: 'filter_drama' },
    rounded: { label: 'Rounded', icon: 'rounded_corner' },
    vignette: { label: 'Vignette', icon: 'vignette' }
};

/**
 * Default border settings
 */
export const DEFAULT_SETTINGS = {
    style: 'solid',
    width: 10,
    color: '#ffffff',
    cornerRadius: 0,
    innerWidth: 0,
    innerColor: '#000000',
    shadowBlur: 0,
    shadowColor: '#000000',
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    paddingBottom: 0 // For polaroid style
};

/**
 * Apply border/frame to canvas
 * @param {HTMLCanvasElement} sourceCanvas - Source canvas
 * @param {Object} settings - Border settings
 * @returns {HTMLCanvasElement} - Canvas with border
 */
export function applyBorder(sourceCanvas, settings = {}) {
    const config = { ...DEFAULT_SETTINGS, ...settings };

    // Calculate new canvas size
    const padding = config.width;
    const extraBottom = config.style === 'polaroid' ? config.width * 3 : 0;
    const newWidth = sourceCanvas.width + padding * 2;
    const newHeight = sourceCanvas.height + padding * 2 + extraBottom;

    // Create result canvas
    const canvas = document.createElement('canvas');
    canvas.width = newWidth;
    canvas.height = newHeight;
    const ctx = canvas.getContext('2d');

    // Draw based on style
    switch (config.style) {
        case 'solid':
            drawSolidBorder(ctx, sourceCanvas, config);
            break;
        case 'double':
            drawDoubleBorder(ctx, sourceCanvas, config);
            break;
        case 'groove':
            drawGrooveBorder(ctx, sourceCanvas, config);
            break;
        case 'polaroid':
            drawPolaroidFrame(ctx, sourceCanvas, config);
            break;
        case 'shadow':
            drawShadowFrame(ctx, sourceCanvas, config);
            break;
        case 'rounded':
            drawRoundedFrame(ctx, sourceCanvas, config);
            break;
        case 'vignette':
            drawVignetteBorder(ctx, sourceCanvas, config);
            break;
        default:
            ctx.drawImage(sourceCanvas, 0, 0);
    }

    return canvas;
}

/**
 * Draw solid border
 */
function drawSolidBorder(ctx, source, config) {
    const { width, color, cornerRadius } = config;
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    // Fill background with border color
    ctx.fillStyle = color;
    if (cornerRadius > 0) {
        roundRect(ctx, 0, 0, w, h, cornerRadius);
        ctx.fill();
    } else {
        ctx.fillRect(0, 0, w, h);
    }

    // Draw image
    if (cornerRadius > 0) {
        ctx.save();
        roundRect(ctx, width, width, source.width, source.height, Math.max(0, cornerRadius - width));
        ctx.clip();
        ctx.drawImage(source, width, width);
        ctx.restore();
    } else {
        ctx.drawImage(source, width, width);
    }
}

/**
 * Draw double border
 */
function drawDoubleBorder(ctx, source, config) {
    const { width, color, innerColor } = config;
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    const innerWidth = Math.max(1, width / 4);
    const gap = Math.max(1, width / 4);

    // Outer border
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);

    // Gap
    ctx.fillStyle = innerColor || '#000000';
    ctx.fillRect(innerWidth, innerWidth, w - innerWidth * 2, h - innerWidth * 2);

    // Inner border
    ctx.fillStyle = color;
    ctx.fillRect(innerWidth + gap, innerWidth + gap,
                 w - (innerWidth + gap) * 2, h - (innerWidth + gap) * 2);

    // Image
    ctx.drawImage(source, width, width);
}

/**
 * Draw groove/3D border
 */
function drawGrooveBorder(ctx, source, config) {
    const { width, color } = config;
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    // Parse color for lighter/darker shades
    const baseColor = hexToRgb(color);
    const lightColor = `rgb(${Math.min(255, baseColor.r + 60)}, ${Math.min(255, baseColor.g + 60)}, ${Math.min(255, baseColor.b + 60)})`;
    const darkColor = `rgb(${Math.max(0, baseColor.r - 60)}, ${Math.max(0, baseColor.g - 60)}, ${Math.max(0, baseColor.b - 60)})`;

    // Fill base
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);

    // Top and left highlight
    ctx.fillStyle = lightColor;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(w, 0);
    ctx.lineTo(w - width / 2, width / 2);
    ctx.lineTo(width / 2, width / 2);
    ctx.lineTo(width / 2, h - width / 2);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    // Bottom and right shadow
    ctx.fillStyle = darkColor;
    ctx.beginPath();
    ctx.moveTo(w, 0);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.lineTo(width / 2, h - width / 2);
    ctx.lineTo(w - width / 2, h - width / 2);
    ctx.lineTo(w - width / 2, width / 2);
    ctx.closePath();
    ctx.fill();

    // Inner groove
    const halfWidth = width / 2;
    ctx.fillStyle = darkColor;
    ctx.beginPath();
    ctx.moveTo(halfWidth, halfWidth);
    ctx.lineTo(w - halfWidth, halfWidth);
    ctx.lineTo(w - width, width);
    ctx.lineTo(width, width);
    ctx.lineTo(width, h - width);
    ctx.lineTo(halfWidth, h - halfWidth);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = lightColor;
    ctx.beginPath();
    ctx.moveTo(w - halfWidth, halfWidth);
    ctx.lineTo(w - halfWidth, h - halfWidth);
    ctx.lineTo(halfWidth, h - halfWidth);
    ctx.lineTo(width, h - width);
    ctx.lineTo(w - width, h - width);
    ctx.lineTo(w - width, width);
    ctx.closePath();
    ctx.fill();

    // Image
    ctx.drawImage(source, width, width);
}

/**
 * Draw polaroid-style frame
 */
function drawPolaroidFrame(ctx, source, config) {
    const { width, color } = config;
    const bottomPadding = width * 3;

    // White frame
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Shadow effect
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 5;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.shadowColor = 'transparent';

    // Image
    ctx.drawImage(source, width, width);
}

/**
 * Draw shadow frame
 */
function drawShadowFrame(ctx, source, config) {
    const { width, shadowBlur, shadowColor, shadowOffsetX, shadowOffsetY } = config;
    const blur = shadowBlur || width;

    // Clear canvas
    ctx.fillStyle = 'transparent';
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Draw shadow
    ctx.shadowColor = shadowColor || 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = blur;
    ctx.shadowOffsetX = shadowOffsetX || blur / 3;
    ctx.shadowOffsetY = shadowOffsetY || blur / 3;
    ctx.fillStyle = '#000';
    ctx.fillRect(width, width, source.width, source.height);
    ctx.shadowColor = 'transparent';

    // Draw image
    ctx.drawImage(source, width, width);
}

/**
 * Draw rounded corner frame
 */
function drawRoundedFrame(ctx, source, config) {
    const { width, color, cornerRadius } = config;
    const radius = cornerRadius || width * 2;

    // Fill background
    ctx.fillStyle = color;
    roundRect(ctx, 0, 0, ctx.canvas.width, ctx.canvas.height, radius + width);
    ctx.fill();

    // Clip and draw image with rounded corners
    ctx.save();
    roundRect(ctx, width, width, source.width, source.height, radius);
    ctx.clip();
    ctx.drawImage(source, width, width);
    ctx.restore();
}

/**
 * Draw vignette border (darkened edges)
 */
function drawVignetteBorder(ctx, source, config) {
    const { width } = config;

    // Draw image first
    ctx.drawImage(source, width, width);

    // Create vignette gradient
    const centerX = ctx.canvas.width / 2;
    const centerY = ctx.canvas.height / 2;
    const radius = Math.sqrt(centerX * centerX + centerY * centerY);

    const gradient = ctx.createRadialGradient(
        centerX, centerY, radius * 0.4,
        centerX, centerY, radius
    );
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.7)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

/**
 * Helper: Draw rounded rectangle path
 */
function roundRect(ctx, x, y, width, height, radius) {
    radius = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

/**
 * Helper: Convert hex to RGB
 */
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
}

/**
 * Create border panel UI
 * @param {Object} options - Configuration options
 * @returns {Object} - Border panel controller
 */
export function createBorderPanel(options = {}) {
    const {
        container,
        onPreview = () => {},
        onApply = () => {}
    } = options;

    let currentSettings = { ...DEFAULT_SETTINGS };

    // Create panel
    const panel = document.createElement('div');
    panel.className = 'border-panel';
    panel.innerHTML = `
        <div class="border-section">
            <div class="border-section-title">Frame Style</div>
            <div class="border-styles">
                ${Object.entries(FRAME_STYLES).map(([key, style]) => `
                    <button class="border-style-btn ${key === currentSettings.style ? 'active' : ''}" data-style="${key}">
                        <span class="material-symbols-outlined">${style.icon}</span>
                        <span>${style.label}</span>
                    </button>
                `).join('')}
            </div>
        </div>
        <div class="border-section">
            <div class="border-section-title">Width</div>
            <div class="border-presets">
                ${Object.entries(BORDER_PRESETS).map(([key, preset]) => `
                    <button class="border-preset-btn ${preset.width === currentSettings.width ? 'active' : ''}" data-width="${preset.width}">
                        ${preset.label}
                    </button>
                `).join('')}
            </div>
            <input type="range" class="border-slider width-slider" min="0" max="100" value="${currentSettings.width}">
        </div>
        <div class="border-section">
            <div class="border-section-title">Color</div>
            <div class="border-colors">
                <input type="color" class="border-color-picker" value="${currentSettings.color}">
                <div class="color-swatches">
                    ${['#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'].map(c => `
                        <button class="color-swatch" style="background: ${c}" data-color="${c}"></button>
                    `).join('')}
                </div>
            </div>
        </div>
        <div class="border-section">
            <div class="border-section-title">Corner Radius</div>
            <input type="range" class="border-slider radius-slider" min="0" max="100" value="${currentSettings.cornerRadius}">
        </div>
        <div class="border-actions">
            <button class="border-btn reset-btn">Reset</button>
            <button class="border-btn apply-btn primary">Apply</button>
        </div>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .border-panel {
            background: rgba(16, 25, 34, 0.95);
            border-radius: 12px;
            padding: 16px;
            width: 300px;
        }
        .border-section {
            margin-bottom: 16px;
        }
        .border-section-title {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #6b7280;
            margin-bottom: 8px;
            font-weight: 600;
        }
        .border-styles {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 6px;
        }
        .border-style-btn {
            padding: 8px;
            border: 1px solid rgba(255,255,255,0.1);
            background: transparent;
            color: #9ca3af;
            border-radius: 8px;
            cursor: pointer;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            font-size: 10px;
        }
        .border-style-btn:hover {
            background: rgba(255,255,255,0.1);
            color: white;
        }
        .border-style-btn.active {
            background: #0d7ff2;
            color: white;
            border-color: #0d7ff2;
        }
        .border-presets {
            display: flex;
            gap: 6px;
            margin-bottom: 8px;
        }
        .border-preset-btn {
            flex: 1;
            padding: 6px;
            border: 1px solid rgba(255,255,255,0.1);
            background: transparent;
            color: #9ca3af;
            border-radius: 6px;
            cursor: pointer;
            font-size: 11px;
        }
        .border-preset-btn:hover,
        .border-preset-btn.active {
            background: rgba(255,255,255,0.1);
            color: white;
        }
        .border-slider {
            width: 100%;
            height: 4px;
            border-radius: 2px;
            background: #374151;
            -webkit-appearance: none;
        }
        .border-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: white;
            cursor: pointer;
        }
        .border-colors {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .border-color-picker {
            width: 40px;
            height: 40px;
            border: 2px solid white;
            border-radius: 8px;
            cursor: pointer;
            padding: 0;
        }
        .color-swatches {
            display: flex;
            gap: 6px;
        }
        .color-swatch {
            width: 24px;
            height: 24px;
            border: 2px solid transparent;
            border-radius: 4px;
            cursor: pointer;
        }
        .color-swatch:hover {
            border-color: white;
        }
        .border-actions {
            display: flex;
            gap: 8px;
            margin-top: 20px;
        }
        .border-btn {
            flex: 1;
            padding: 10px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 500;
        }
        .border-btn.primary {
            background: #0d7ff2;
            color: white;
        }
        .border-btn.reset-btn {
            background: transparent;
            color: #9ca3af;
            border: 1px solid rgba(255,255,255,0.2);
        }
    `;
    document.head.appendChild(style);

    // Event handlers
    panel.querySelectorAll('.border-style-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            panel.querySelectorAll('.border-style-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentSettings.style = btn.dataset.style;
            onPreview(currentSettings);
        });
    });

    panel.querySelectorAll('.border-preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            panel.querySelectorAll('.border-preset-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentSettings.width = parseInt(btn.dataset.width);
            panel.querySelector('.width-slider').value = currentSettings.width;
            onPreview(currentSettings);
        });
    });

    panel.querySelector('.width-slider').addEventListener('input', (e) => {
        currentSettings.width = parseInt(e.target.value);
        panel.querySelectorAll('.border-preset-btn').forEach(b => b.classList.remove('active'));
        onPreview(currentSettings);
    });

    panel.querySelector('.border-color-picker').addEventListener('input', (e) => {
        currentSettings.color = e.target.value;
        onPreview(currentSettings);
    });

    panel.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.addEventListener('click', () => {
            currentSettings.color = swatch.dataset.color;
            panel.querySelector('.border-color-picker').value = currentSettings.color;
            onPreview(currentSettings);
        });
    });

    panel.querySelector('.radius-slider').addEventListener('input', (e) => {
        currentSettings.cornerRadius = parseInt(e.target.value);
        onPreview(currentSettings);
    });

    panel.querySelector('.reset-btn').addEventListener('click', () => {
        currentSettings = { ...DEFAULT_SETTINGS };
        panel.querySelector('.width-slider').value = currentSettings.width;
        panel.querySelector('.radius-slider').value = currentSettings.cornerRadius;
        panel.querySelector('.border-color-picker').value = currentSettings.color;
        panel.querySelectorAll('.border-style-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.style === currentSettings.style);
        });
        onPreview(currentSettings);
    });

    panel.querySelector('.apply-btn').addEventListener('click', () => {
        onApply(currentSettings);
    });

    if (container) {
        container.appendChild(panel);
    }

    return {
        element: panel,
        getSettings() {
            return { ...currentSettings };
        },
        setSettings(settings) {
            currentSettings = { ...currentSettings, ...settings };
        },
        destroy() {
            panel.remove();
            style.remove();
        }
    };
}
