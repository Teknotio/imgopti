/**
 * Background Removal Module
 * AI-powered background removal using TensorFlow.js
 */

// TensorFlow.js and BodyPix model URLs
const TFJS_URL = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.10.0/dist/tf.min.js';
const BODYPIX_URL = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/body-pix@2.2.0/dist/body-pix.min.js';

let tf = null;
let bodyPix = null;
let model = null;
let isModelLoaded = false;

/**
 * Load TensorFlow.js and BodyPix model
 * @returns {Promise<boolean>}
 */
export async function loadModel() {
    if (isModelLoaded) return true;

    try {
        // Load TensorFlow.js
        if (!window.tf) {
            await loadScript(TFJS_URL);
        }
        tf = window.tf;

        // Load BodyPix
        if (!window.bodyPix) {
            await loadScript(BODYPIX_URL);
        }
        bodyPix = window.bodyPix;

        // Load model
        model = await bodyPix.load({
            architecture: 'MobileNetV1',
            outputStride: 16,
            multiplier: 0.75,
            quantBytes: 2
        });

        isModelLoaded = true;
        console.log('Background removal model loaded');
        return true;
    } catch (error) {
        console.error('Failed to load background removal model:', error);
        return false;
    }
}

/**
 * Load external script
 * @param {string} url
 * @returns {Promise}
 */
function loadScript(url) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

/**
 * Remove background from image
 * @param {HTMLImageElement|HTMLCanvasElement} source - Source image
 * @param {Object} options - Options
 * @returns {Promise<HTMLCanvasElement>} - Image with transparent background
 */
export async function removeBackground(source, options = {}) {
    const {
        threshold = 0.75,
        blur = 3,
        edgeBlur = 3,
        flipHorizontal = false,
        onProgress = () => {}
    } = options;

    // Ensure model is loaded
    if (!isModelLoaded) {
        onProgress('Loading AI model...', 0);
        const loaded = await loadModel();
        if (!loaded) {
            throw new Error('Failed to load background removal model');
        }
    }

    onProgress('Analyzing image...', 30);

    // Get image dimensions
    const width = source.naturalWidth || source.width;
    const height = source.naturalHeight || source.height;

    // Create canvas from source
    const inputCanvas = document.createElement('canvas');
    inputCanvas.width = width;
    inputCanvas.height = height;
    const inputCtx = inputCanvas.getContext('2d');
    inputCtx.drawImage(source, 0, 0);

    onProgress('Detecting subject...', 50);

    // Segment person
    const segmentation = await model.segmentPerson(inputCanvas, {
        flipHorizontal,
        internalResolution: 'medium',
        segmentationThreshold: threshold
    });

    onProgress('Creating mask...', 70);

    // Create mask
    const maskData = segmentation.data;
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = width;
    outputCanvas.height = height;
    const outputCtx = outputCanvas.getContext('2d');

    // Get source pixels
    const imageData = inputCtx.getImageData(0, 0, width, height);
    const pixels = imageData.data;

    // Apply mask
    for (let i = 0; i < maskData.length; i++) {
        const alphaIndex = i * 4 + 3;
        if (maskData[i] === 0) {
            pixels[alphaIndex] = 0; // Make background transparent
        }
    }

    outputCtx.putImageData(imageData, 0, 0);

    onProgress('Refining edges...', 85);

    // Apply edge blur for smoother cutout
    if (edgeBlur > 0) {
        applyEdgeRefinement(outputCanvas, edgeBlur);
    }

    onProgress('Complete!', 100);

    return outputCanvas;
}

/**
 * Apply edge refinement for smoother cutout
 * @param {HTMLCanvasElement} canvas
 * @param {number} radius
 */
function applyEdgeRefinement(canvas, radius) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = canvas.width;
    const height = canvas.height;

    // Create alpha mask
    const alpha = new Float32Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
        alpha[i / 4] = data[i + 3] / 255;
    }

    // Box blur the alpha channel
    const blurred = boxBlur(alpha, width, height, radius);

    // Apply blurred alpha back
    for (let i = 0; i < blurred.length; i++) {
        data[i * 4 + 3] = Math.round(blurred[i] * 255);
    }

    ctx.putImageData(imageData, 0, 0);
}

/**
 * Simple box blur
 */
function boxBlur(data, width, height, radius) {
    const result = new Float32Array(data.length);
    const size = radius * 2 + 1;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let sum = 0;
            let count = 0;

            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        sum += data[ny * width + nx];
                        count++;
                    }
                }
            }

            result[y * width + x] = sum / count;
        }
    }

    return result;
}

/**
 * Replace background with color or image
 * @param {HTMLCanvasElement} foreground - Foreground with transparent background
 * @param {string|HTMLImageElement|HTMLCanvasElement} background - Background color or image
 * @returns {HTMLCanvasElement}
 */
export function replaceBackground(foreground, background) {
    const canvas = document.createElement('canvas');
    canvas.width = foreground.width;
    canvas.height = foreground.height;
    const ctx = canvas.getContext('2d');

    // Draw background
    if (typeof background === 'string') {
        // Color
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
        // Image
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
    }

    // Draw foreground
    ctx.drawImage(foreground, 0, 0);

    return canvas;
}

/**
 * Create background removal UI
 * @param {Object} options - Configuration options
 * @returns {Object} - UI controller
 */
export function createBackgroundRemovalUI(options = {}) {
    const {
        container,
        onComplete = () => {}
    } = options;

    let sourceCanvas = null;
    let resultCanvas = null;

    // Create UI
    const panel = document.createElement('div');
    panel.className = 'bg-removal-panel';
    panel.innerHTML = `
        <div class="bg-removal-header">
            <span class="material-symbols-outlined">auto_fix_high</span>
            <span>Remove Background</span>
        </div>
        <div class="bg-removal-preview">
            <div class="preview-placeholder">
                <span class="material-symbols-outlined">image</span>
                <span>Select an image to remove background</span>
            </div>
            <canvas class="preview-canvas" style="display: none;"></canvas>
        </div>
        <div class="bg-removal-progress" style="display: none;">
            <div class="progress-bar">
                <div class="progress-fill"></div>
            </div>
            <div class="progress-text">Loading...</div>
        </div>
        <div class="bg-replacement">
            <div class="replacement-title">New Background</div>
            <div class="replacement-options">
                <button class="replacement-btn active" data-bg="transparent">
                    <div class="checkerboard"></div>
                    <span>Transparent</span>
                </button>
                <button class="replacement-btn" data-bg="#ffffff">
                    <div style="background: #ffffff;"></div>
                    <span>White</span>
                </button>
                <button class="replacement-btn" data-bg="#000000">
                    <div style="background: #000000;"></div>
                    <span>Black</span>
                </button>
                <button class="replacement-btn" data-bg="custom">
                    <input type="color" class="custom-bg-color" value="#0d7ff2">
                    <span>Custom</span>
                </button>
            </div>
        </div>
        <div class="bg-removal-settings">
            <div class="setting-row">
                <span>Edge Smoothness</span>
                <input type="range" class="edge-blur-slider" min="0" max="10" value="3">
            </div>
            <div class="setting-row">
                <span>Detection Threshold</span>
                <input type="range" class="threshold-slider" min="50" max="100" value="75">
            </div>
        </div>
        <div class="bg-removal-actions">
            <button class="action-btn process-btn primary" disabled>
                <span class="material-symbols-outlined">magic_button</span>
                Remove Background
            </button>
            <button class="action-btn apply-btn" style="display: none;">Apply</button>
        </div>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .bg-removal-panel {
            background: rgba(16, 25, 34, 0.95);
            border-radius: 16px;
            padding: 20px;
            width: 100%;
            max-width: 500px;
        }
        .bg-removal-header {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 18px;
            font-weight: 600;
            color: white;
            margin-bottom: 16px;
        }
        .bg-removal-preview {
            background: #1a2634;
            border-radius: 12px;
            aspect-ratio: 16/9;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 16px;
            overflow: hidden;
        }
        .preview-placeholder {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            color: #6b7280;
        }
        .preview-placeholder .material-symbols-outlined {
            font-size: 48px;
        }
        .preview-canvas {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
        }
        .bg-removal-progress {
            margin-bottom: 16px;
        }
        .progress-bar {
            height: 4px;
            background: #374151;
            border-radius: 2px;
            overflow: hidden;
        }
        .progress-fill {
            height: 100%;
            background: #0d7ff2;
            width: 0%;
            transition: width 0.3s ease;
        }
        .progress-text {
            font-size: 12px;
            color: #9ca3af;
            margin-top: 8px;
            text-align: center;
        }
        .bg-replacement {
            margin-bottom: 16px;
        }
        .replacement-title {
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 8px;
        }
        .replacement-options {
            display: flex;
            gap: 8px;
        }
        .replacement-btn {
            flex: 1;
            padding: 8px;
            border: 2px solid rgba(255,255,255,0.1);
            background: transparent;
            border-radius: 8px;
            cursor: pointer;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            color: #9ca3af;
            font-size: 11px;
        }
        .replacement-btn:hover,
        .replacement-btn.active {
            border-color: #0d7ff2;
            color: white;
        }
        .replacement-btn div:first-child {
            width: 32px;
            height: 32px;
            border-radius: 4px;
        }
        .checkerboard {
            background-image:
                linear-gradient(45deg, #ccc 25%, transparent 25%),
                linear-gradient(-45deg, #ccc 25%, transparent 25%),
                linear-gradient(45deg, transparent 75%, #ccc 75%),
                linear-gradient(-45deg, transparent 75%, #ccc 75%);
            background-size: 8px 8px;
            background-position: 0 0, 0 4px, 4px -4px, -4px 0px;
        }
        .custom-bg-color {
            width: 32px;
            height: 32px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            padding: 0;
        }
        .bg-removal-settings {
            margin-bottom: 16px;
        }
        .setting-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            color: #9ca3af;
            font-size: 13px;
        }
        .setting-row input[type="range"] {
            width: 120px;
            height: 4px;
            border-radius: 2px;
            background: #374151;
            -webkit-appearance: none;
        }
        .setting-row input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: white;
            cursor: pointer;
        }
        .bg-removal-actions {
            display: flex;
            gap: 8px;
        }
        .action-btn {
            flex: 1;
            padding: 12px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 500;
            font-size: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        .action-btn.primary {
            background: #0d7ff2;
            color: white;
        }
        .action-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .action-btn.apply-btn {
            background: #10b981;
            color: white;
        }
    `;
    document.head.appendChild(style);

    const previewCanvas = panel.querySelector('.preview-canvas');
    const previewCtx = previewCanvas.getContext('2d');
    const progressBar = panel.querySelector('.bg-removal-progress');
    const progressFill = panel.querySelector('.progress-fill');
    const progressText = panel.querySelector('.progress-text');
    const processBtn = panel.querySelector('.process-btn');
    const applyBtn = panel.querySelector('.apply-btn');

    let selectedBackground = 'transparent';

    // Background selection
    panel.querySelectorAll('.replacement-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            panel.querySelectorAll('.replacement-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const bg = btn.dataset.bg;
            if (bg === 'custom') {
                selectedBackground = panel.querySelector('.custom-bg-color').value;
            } else {
                selectedBackground = bg;
            }

            // Update preview if result exists
            if (resultCanvas) {
                updatePreview();
            }
        });
    });

    panel.querySelector('.custom-bg-color').addEventListener('input', (e) => {
        const customBtn = panel.querySelector('[data-bg="custom"]');
        if (customBtn.classList.contains('active')) {
            selectedBackground = e.target.value;
            if (resultCanvas) {
                updatePreview();
            }
        }
    });

    // Process button
    processBtn.addEventListener('click', async () => {
        if (!sourceCanvas) return;

        processBtn.disabled = true;
        progressBar.style.display = 'block';

        try {
            const edgeBlur = parseInt(panel.querySelector('.edge-blur-slider').value);
            const threshold = parseInt(panel.querySelector('.threshold-slider').value) / 100;

            resultCanvas = await removeBackground(sourceCanvas, {
                edgeBlur,
                threshold,
                onProgress: (text, percent) => {
                    progressFill.style.width = `${percent}%`;
                    progressText.textContent = text;
                }
            });

            updatePreview();
            applyBtn.style.display = 'block';
        } catch (error) {
            progressText.textContent = 'Error: ' + error.message;
        }

        processBtn.disabled = false;
    });

    // Apply button
    applyBtn.addEventListener('click', () => {
        if (resultCanvas) {
            let finalCanvas = resultCanvas;
            if (selectedBackground !== 'transparent') {
                finalCanvas = replaceBackground(resultCanvas, selectedBackground);
            }
            onComplete(finalCanvas);
        }
    });

    function updatePreview() {
        if (!resultCanvas) return;

        const placeholder = panel.querySelector('.preview-placeholder');
        placeholder.style.display = 'none';
        previewCanvas.style.display = 'block';

        previewCanvas.width = resultCanvas.width;
        previewCanvas.height = resultCanvas.height;

        if (selectedBackground === 'transparent') {
            // Draw checkerboard background
            drawCheckerboard(previewCtx, previewCanvas.width, previewCanvas.height);
            previewCtx.drawImage(resultCanvas, 0, 0);
        } else {
            previewCtx.fillStyle = selectedBackground;
            previewCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
            previewCtx.drawImage(resultCanvas, 0, 0);
        }
    }

    function drawCheckerboard(ctx, w, h) {
        const size = 10;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#cccccc';

        for (let y = 0; y < h; y += size) {
            for (let x = 0; x < w; x += size) {
                if ((x / size + y / size) % 2 === 0) {
                    ctx.fillRect(x, y, size, size);
                }
            }
        }
    }

    if (container) {
        container.appendChild(panel);
    }

    return {
        element: panel,
        setSource(canvas) {
            sourceCanvas = canvas;
            resultCanvas = null;
            processBtn.disabled = false;
            applyBtn.style.display = 'none';
            progressBar.style.display = 'none';

            // Show source preview
            previewCanvas.width = canvas.width;
            previewCanvas.height = canvas.height;
            previewCtx.drawImage(canvas, 0, 0);
            panel.querySelector('.preview-placeholder').style.display = 'none';
            previewCanvas.style.display = 'block';
        },
        getResult() {
            if (!resultCanvas) return null;
            if (selectedBackground === 'transparent') {
                return resultCanvas;
            }
            return replaceBackground(resultCanvas, selectedBackground);
        },
        destroy() {
            panel.remove();
            style.remove();
        }
    };
}
