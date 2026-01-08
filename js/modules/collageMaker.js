/**
 * Collage Maker Module
 * Create photo collages with various layouts
 */

/**
 * Collage layout templates
 */
export const COLLAGE_LAYOUTS = {
    grid2x2: {
        label: '2×2 Grid',
        slots: 4,
        cells: [
            { x: 0, y: 0, w: 0.5, h: 0.5 },
            { x: 0.5, y: 0, w: 0.5, h: 0.5 },
            { x: 0, y: 0.5, w: 0.5, h: 0.5 },
            { x: 0.5, y: 0.5, w: 0.5, h: 0.5 }
        ]
    },
    grid3x3: {
        label: '3×3 Grid',
        slots: 9,
        cells: [
            { x: 0, y: 0, w: 0.333, h: 0.333 },
            { x: 0.333, y: 0, w: 0.333, h: 0.333 },
            { x: 0.666, y: 0, w: 0.334, h: 0.333 },
            { x: 0, y: 0.333, w: 0.333, h: 0.333 },
            { x: 0.333, y: 0.333, w: 0.333, h: 0.333 },
            { x: 0.666, y: 0.333, w: 0.334, h: 0.333 },
            { x: 0, y: 0.666, w: 0.333, h: 0.334 },
            { x: 0.333, y: 0.666, w: 0.333, h: 0.334 },
            { x: 0.666, y: 0.666, w: 0.334, h: 0.334 }
        ]
    },
    horizontal2: {
        label: '2 Horizontal',
        slots: 2,
        cells: [
            { x: 0, y: 0, w: 0.5, h: 1 },
            { x: 0.5, y: 0, w: 0.5, h: 1 }
        ]
    },
    horizontal3: {
        label: '3 Horizontal',
        slots: 3,
        cells: [
            { x: 0, y: 0, w: 0.333, h: 1 },
            { x: 0.333, y: 0, w: 0.333, h: 1 },
            { x: 0.666, y: 0, w: 0.334, h: 1 }
        ]
    },
    vertical2: {
        label: '2 Vertical',
        slots: 2,
        cells: [
            { x: 0, y: 0, w: 1, h: 0.5 },
            { x: 0, y: 0.5, w: 1, h: 0.5 }
        ]
    },
    vertical3: {
        label: '3 Vertical',
        slots: 3,
        cells: [
            { x: 0, y: 0, w: 1, h: 0.333 },
            { x: 0, y: 0.333, w: 1, h: 0.333 },
            { x: 0, y: 0.666, w: 1, h: 0.334 }
        ]
    },
    bigLeft: {
        label: 'Big Left',
        slots: 3,
        cells: [
            { x: 0, y: 0, w: 0.6, h: 1 },
            { x: 0.6, y: 0, w: 0.4, h: 0.5 },
            { x: 0.6, y: 0.5, w: 0.4, h: 0.5 }
        ]
    },
    bigRight: {
        label: 'Big Right',
        slots: 3,
        cells: [
            { x: 0, y: 0, w: 0.4, h: 0.5 },
            { x: 0, y: 0.5, w: 0.4, h: 0.5 },
            { x: 0.4, y: 0, w: 0.6, h: 1 }
        ]
    },
    bigTop: {
        label: 'Big Top',
        slots: 3,
        cells: [
            { x: 0, y: 0, w: 1, h: 0.6 },
            { x: 0, y: 0.6, w: 0.5, h: 0.4 },
            { x: 0.5, y: 0.6, w: 0.5, h: 0.4 }
        ]
    },
    featured: {
        label: 'Featured',
        slots: 5,
        cells: [
            { x: 0, y: 0, w: 0.6, h: 0.6 },
            { x: 0.6, y: 0, w: 0.4, h: 0.3 },
            { x: 0.6, y: 0.3, w: 0.4, h: 0.3 },
            { x: 0, y: 0.6, w: 0.3, h: 0.4 },
            { x: 0.3, y: 0.6, w: 0.7, h: 0.4 }
        ]
    },
    diagonal: {
        label: 'Diagonal',
        slots: 4,
        cells: [
            { x: 0, y: 0, w: 0.55, h: 0.55 },
            { x: 0.45, y: 0.1, w: 0.55, h: 0.45 },
            { x: 0, y: 0.45, w: 0.45, h: 0.55 },
            { x: 0.45, y: 0.55, w: 0.55, h: 0.45 }
        ]
    },
    mosaic: {
        label: 'Mosaic',
        slots: 6,
        cells: [
            { x: 0, y: 0, w: 0.5, h: 0.333 },
            { x: 0.5, y: 0, w: 0.5, h: 0.5 },
            { x: 0, y: 0.333, w: 0.25, h: 0.333 },
            { x: 0.25, y: 0.333, w: 0.25, h: 0.333 },
            { x: 0, y: 0.666, w: 0.5, h: 0.334 },
            { x: 0.5, y: 0.5, w: 0.5, h: 0.5 }
        ]
    }
};

/**
 * Default collage settings
 */
export const DEFAULT_SETTINGS = {
    layout: 'grid2x2',
    width: 1080,
    height: 1080,
    backgroundColor: '#ffffff',
    spacing: 4,
    cornerRadius: 0,
    borderWidth: 0,
    borderColor: '#ffffff'
};

/**
 * Create collage from images
 * @param {Array<HTMLImageElement|HTMLCanvasElement>} images - Array of images
 * @param {Object} settings - Collage settings
 * @returns {HTMLCanvasElement} - Collage canvas
 */
export function createCollage(images, settings = {}) {
    const config = { ...DEFAULT_SETTINGS, ...settings };
    const layout = COLLAGE_LAYOUTS[config.layout] || COLLAGE_LAYOUTS.grid2x2;

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = config.width;
    canvas.height = config.height;
    const ctx = canvas.getContext('2d');

    // Fill background
    ctx.fillStyle = config.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw each cell
    layout.cells.forEach((cell, index) => {
        const image = images[index];
        if (!image) return;

        const x = cell.x * canvas.width + config.spacing;
        const y = cell.y * canvas.height + config.spacing;
        const w = cell.w * canvas.width - config.spacing * 2;
        const h = cell.h * canvas.height - config.spacing * 2;

        ctx.save();

        // Apply corner radius if set
        if (config.cornerRadius > 0) {
            roundRect(ctx, x, y, w, h, config.cornerRadius);
            ctx.clip();
        }

        // Draw border if set
        if (config.borderWidth > 0) {
            ctx.fillStyle = config.borderColor;
            ctx.fillRect(x, y, w, h);
            // Adjust for border
            const bw = config.borderWidth;
            drawImageCover(ctx, image, x + bw, y + bw, w - bw * 2, h - bw * 2);
        } else {
            drawImageCover(ctx, image, x, y, w, h);
        }

        ctx.restore();
    });

    return canvas;
}

/**
 * Draw image with cover fit (fill & crop)
 */
function drawImageCover(ctx, image, x, y, w, h) {
    const imgW = image.naturalWidth || image.width;
    const imgH = image.naturalHeight || image.height;
    const imgRatio = imgW / imgH;
    const cellRatio = w / h;

    let sx, sy, sw, sh;

    if (imgRatio > cellRatio) {
        // Image is wider - crop sides
        sh = imgH;
        sw = sh * cellRatio;
        sx = (imgW - sw) / 2;
        sy = 0;
    } else {
        // Image is taller - crop top/bottom
        sw = imgW;
        sh = sw / cellRatio;
        sx = 0;
        sy = (imgH - sh) / 2;
    }

    ctx.drawImage(image, sx, sy, sw, sh, x, y, w, h);
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
 * Create collage maker UI
 * @param {Object} options - Configuration options
 * @returns {Object} - Collage maker controller
 */
export function createCollageMaker(options = {}) {
    const {
        container,
        onImageRequest = () => {},
        onCollageReady = () => {}
    } = options;

    let currentSettings = { ...DEFAULT_SETTINGS };
    let images = [];

    // Create UI
    const panel = document.createElement('div');
    panel.className = 'collage-maker';
    panel.innerHTML = `
        <div class="collage-header">
            <span class="material-symbols-outlined">grid_view</span>
            <span>Collage Maker</span>
        </div>
        <div class="collage-layouts">
            ${Object.entries(COLLAGE_LAYOUTS).map(([key, layout]) => `
                <button class="layout-btn ${key === currentSettings.layout ? 'active' : ''}"
                        data-layout="${key}" title="${layout.label}">
                    <div class="layout-preview" data-slots="${layout.slots}">
                        ${layout.cells.map((c, i) => `
                            <div class="layout-cell" style="
                                left: ${c.x * 100}%;
                                top: ${c.y * 100}%;
                                width: ${c.w * 100}%;
                                height: ${c.h * 100}%;
                            "></div>
                        `).join('')}
                    </div>
                    <span class="layout-label">${layout.label}</span>
                </button>
            `).join('')}
        </div>
        <div class="collage-preview-container">
            <div class="collage-preview">
                <div class="collage-grid" id="collageGrid"></div>
            </div>
        </div>
        <div class="collage-settings">
            <div class="setting-row">
                <span>Spacing</span>
                <input type="range" class="collage-slider spacing-slider" min="0" max="20" value="${currentSettings.spacing}">
            </div>
            <div class="setting-row">
                <span>Corners</span>
                <input type="range" class="collage-slider corners-slider" min="0" max="30" value="${currentSettings.cornerRadius}">
            </div>
            <div class="setting-row">
                <span>Background</span>
                <input type="color" class="bg-color-picker" value="${currentSettings.backgroundColor}">
            </div>
        </div>
        <div class="collage-actions">
            <button class="collage-btn clear-btn">Clear All</button>
            <button class="collage-btn create-btn primary">Create Collage</button>
        </div>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .collage-maker {
            background: rgba(16, 25, 34, 0.95);
            border-radius: 16px;
            padding: 20px;
            width: 100%;
            max-width: 600px;
        }
        .collage-header {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 18px;
            font-weight: 600;
            color: white;
            margin-bottom: 16px;
        }
        .collage-layouts {
            display: grid;
            grid-template-columns: repeat(6, 1fr);
            gap: 8px;
            margin-bottom: 20px;
        }
        .layout-btn {
            padding: 8px;
            border: 2px solid rgba(255,255,255,0.1);
            background: transparent;
            border-radius: 8px;
            cursor: pointer;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
        }
        .layout-btn:hover {
            border-color: rgba(255,255,255,0.3);
        }
        .layout-btn.active {
            border-color: #0d7ff2;
            background: rgba(13, 127, 242, 0.1);
        }
        .layout-preview {
            width: 40px;
            height: 40px;
            position: relative;
            background: #374151;
            border-radius: 4px;
            overflow: hidden;
        }
        .layout-cell {
            position: absolute;
            background: #6b7280;
            border: 1px solid #374151;
            box-sizing: border-box;
        }
        .layout-label {
            font-size: 9px;
            color: #9ca3af;
        }
        .collage-preview-container {
            background: #1a2634;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 16px;
        }
        .collage-preview {
            aspect-ratio: 1;
            background: ${currentSettings.backgroundColor};
            border-radius: 8px;
            overflow: hidden;
            position: relative;
        }
        .collage-grid {
            width: 100%;
            height: 100%;
            position: relative;
        }
        .collage-slot {
            position: absolute;
            background: rgba(255,255,255,0.1);
            border: 2px dashed rgba(255,255,255,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s;
            overflow: hidden;
        }
        .collage-slot:hover {
            background: rgba(255,255,255,0.15);
            border-color: #0d7ff2;
        }
        .collage-slot.has-image {
            border: none;
            background: transparent;
        }
        .collage-slot img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .collage-slot .add-icon {
            color: rgba(255,255,255,0.5);
            font-size: 32px;
        }
        .collage-slot.has-image .add-icon {
            display: none;
        }
        .collage-slot .remove-btn {
            position: absolute;
            top: 4px;
            right: 4px;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: rgba(0,0,0,0.7);
            color: white;
            border: none;
            cursor: pointer;
            display: none;
            align-items: center;
            justify-content: center;
        }
        .collage-slot.has-image:hover .remove-btn {
            display: flex;
        }
        .collage-settings {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-bottom: 16px;
        }
        .setting-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            color: #9ca3af;
            font-size: 13px;
        }
        .collage-slider {
            width: 150px;
            height: 4px;
            border-radius: 2px;
            background: #374151;
            -webkit-appearance: none;
        }
        .collage-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: white;
            cursor: pointer;
        }
        .bg-color-picker {
            width: 32px;
            height: 32px;
            border: 2px solid white;
            border-radius: 6px;
            cursor: pointer;
            padding: 0;
        }
        .collage-actions {
            display: flex;
            gap: 8px;
        }
        .collage-btn {
            flex: 1;
            padding: 12px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 500;
            font-size: 14px;
        }
        .collage-btn.primary {
            background: #0d7ff2;
            color: white;
        }
        .collage-btn.clear-btn {
            background: transparent;
            color: #9ca3af;
            border: 1px solid rgba(255,255,255,0.2);
        }
    `;
    document.head.appendChild(style);

    /**
     * Render the collage grid preview
     */
    function renderGrid() {
        const layout = COLLAGE_LAYOUTS[currentSettings.layout];
        const grid = panel.querySelector('#collageGrid');
        const spacing = currentSettings.spacing;

        grid.innerHTML = layout.cells.map((cell, i) => `
            <div class="collage-slot ${images[i] ? 'has-image' : ''}"
                 data-index="${i}"
                 style="
                    left: calc(${cell.x * 100}% + ${spacing}px);
                    top: calc(${cell.y * 100}% + ${spacing}px);
                    width: calc(${cell.w * 100}% - ${spacing * 2}px);
                    height: calc(${cell.h * 100}% - ${spacing * 2}px);
                    border-radius: ${currentSettings.cornerRadius}px;
                 ">
                ${images[i] ? `<img src="${images[i].src}">` : ''}
                <span class="material-symbols-outlined add-icon">add_photo_alternate</span>
                <button class="remove-btn">
                    <span class="material-symbols-outlined" style="font-size: 16px;">close</span>
                </button>
            </div>
        `).join('');

        // Update preview background
        panel.querySelector('.collage-preview').style.background = currentSettings.backgroundColor;

        // Attach slot event listeners
        grid.querySelectorAll('.collage-slot').forEach(slot => {
            slot.addEventListener('click', (e) => {
                if (e.target.closest('.remove-btn')) {
                    const index = parseInt(slot.dataset.index);
                    images[index] = null;
                    renderGrid();
                } else if (!images[parseInt(slot.dataset.index)]) {
                    onImageRequest(parseInt(slot.dataset.index));
                }
            });
        });
    }

    // Event handlers
    panel.querySelectorAll('.layout-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            panel.querySelectorAll('.layout-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentSettings.layout = btn.dataset.layout;
            renderGrid();
        });
    });

    panel.querySelector('.spacing-slider').addEventListener('input', (e) => {
        currentSettings.spacing = parseInt(e.target.value);
        renderGrid();
    });

    panel.querySelector('.corners-slider').addEventListener('input', (e) => {
        currentSettings.cornerRadius = parseInt(e.target.value);
        renderGrid();
    });

    panel.querySelector('.bg-color-picker').addEventListener('input', (e) => {
        currentSettings.backgroundColor = e.target.value;
        renderGrid();
    });

    panel.querySelector('.clear-btn').addEventListener('click', () => {
        images = [];
        renderGrid();
    });

    panel.querySelector('.create-btn').addEventListener('click', () => {
        const validImages = images.filter(img => img);
        if (validImages.length > 0) {
            const collage = createCollage(images, currentSettings);
            onCollageReady(collage);
        }
    });

    // Initial render
    renderGrid();

    if (container) {
        container.appendChild(panel);
    }

    return {
        element: panel,
        setImage(index, img) {
            images[index] = img;
            renderGrid();
        },
        getImages() {
            return [...images];
        },
        getSettings() {
            return { ...currentSettings };
        },
        setSettings(settings) {
            currentSettings = { ...currentSettings, ...settings };
            renderGrid();
        },
        create() {
            return createCollage(images, currentSettings);
        },
        destroy() {
            panel.remove();
            style.remove();
        }
    };
}
