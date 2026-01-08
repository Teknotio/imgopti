/**
 * Image Editor Module
 * Handles crop, rotate, flip, and filters
 */

import { ImageOptimizerError, ErrorCodes } from './utils.js';

// Filter presets
export const FILTER_PRESETS = {
    none: { brightness: 100, contrast: 100, saturation: 100, grayscale: 0, sepia: 0 },
    vivid: { brightness: 105, contrast: 115, saturation: 130, grayscale: 0, sepia: 0 },
    muted: { brightness: 100, contrast: 90, saturation: 70, grayscale: 0, sepia: 0 },
    grayscale: { brightness: 100, contrast: 100, saturation: 0, grayscale: 100, sepia: 0 },
    sepia: { brightness: 100, contrast: 100, saturation: 100, grayscale: 0, sepia: 100 },
    warm: { brightness: 105, contrast: 105, saturation: 110, grayscale: 0, sepia: 20 },
    cool: { brightness: 100, contrast: 105, saturation: 90, grayscale: 0, sepia: 0 },
    highContrast: { brightness: 100, contrast: 140, saturation: 100, grayscale: 0, sepia: 0 }
};

/**
 * Apply rotation to canvas
 * @param {HTMLCanvasElement} sourceCanvas - Source canvas
 * @param {number} degrees - Rotation in degrees (90, 180, 270)
 * @returns {HTMLCanvasElement} - Rotated canvas
 */
export function rotateCanvas(sourceCanvas, degrees) {
    const radians = (degrees * Math.PI) / 180;

    // Calculate new dimensions
    let newWidth = sourceCanvas.width;
    let newHeight = sourceCanvas.height;

    if (degrees === 90 || degrees === 270) {
        newWidth = sourceCanvas.height;
        newHeight = sourceCanvas.width;
    }

    const canvas = document.createElement('canvas');
    canvas.width = newWidth;
    canvas.height = newHeight;

    const ctx = canvas.getContext('2d');
    ctx.translate(newWidth / 2, newHeight / 2);
    ctx.rotate(radians);
    ctx.drawImage(sourceCanvas, -sourceCanvas.width / 2, -sourceCanvas.height / 2);

    return canvas;
}

/**
 * Flip canvas horizontally or vertically
 * @param {HTMLCanvasElement} sourceCanvas - Source canvas
 * @param {string} direction - 'horizontal' or 'vertical'
 * @returns {HTMLCanvasElement} - Flipped canvas
 */
export function flipCanvas(sourceCanvas, direction) {
    const canvas = document.createElement('canvas');
    canvas.width = sourceCanvas.width;
    canvas.height = sourceCanvas.height;

    const ctx = canvas.getContext('2d');

    if (direction === 'horizontal') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
    } else {
        ctx.translate(0, canvas.height);
        ctx.scale(1, -1);
    }

    ctx.drawImage(sourceCanvas, 0, 0);

    return canvas;
}

/**
 * Crop canvas to specified region
 * @param {HTMLCanvasElement} sourceCanvas - Source canvas
 * @param {Object} cropArea - { x, y, width, height } in pixels
 * @returns {HTMLCanvasElement} - Cropped canvas
 */
export function cropCanvas(sourceCanvas, cropArea) {
    const { x, y, width, height } = cropArea;

    // Validate crop area
    if (x < 0 || y < 0 || width <= 0 || height <= 0) {
        throw new ImageOptimizerError('Invalid crop area', ErrorCodes.CANVAS_MEMORY);
    }

    if (x + width > sourceCanvas.width || y + height > sourceCanvas.height) {
        throw new ImageOptimizerError('Crop area exceeds image bounds', ErrorCodes.CANVAS_MEMORY);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(
        sourceCanvas,
        x, y, width, height,  // Source rectangle
        0, 0, width, height   // Destination rectangle
    );

    return canvas;
}

/**
 * Apply filters to canvas using CSS filter string
 * @param {HTMLCanvasElement} sourceCanvas - Source canvas
 * @param {Object} filters - Filter values
 * @returns {HTMLCanvasElement} - Filtered canvas
 */
export function applyFilters(sourceCanvas, filters) {
    const {
        brightness = 100,
        contrast = 100,
        saturation = 100,
        grayscale = 0,
        sepia = 0,
        blur = 0,
        hueRotate = 0
    } = filters;

    const canvas = document.createElement('canvas');
    canvas.width = sourceCanvas.width;
    canvas.height = sourceCanvas.height;

    const ctx = canvas.getContext('2d');

    // Build CSS filter string
    const filterString = [
        `brightness(${brightness}%)`,
        `contrast(${contrast}%)`,
        `saturate(${saturation}%)`,
        `grayscale(${grayscale}%)`,
        `sepia(${sepia}%)`,
        blur > 0 ? `blur(${blur}px)` : '',
        hueRotate !== 0 ? `hue-rotate(${hueRotate}deg)` : ''
    ].filter(Boolean).join(' ');

    ctx.filter = filterString;
    ctx.drawImage(sourceCanvas, 0, 0);
    ctx.filter = 'none';

    return canvas;
}

/**
 * Apply filters using pixel manipulation (fallback for older browsers)
 * @param {HTMLCanvasElement} sourceCanvas - Source canvas
 * @param {Object} filters - Filter values
 * @returns {HTMLCanvasElement} - Filtered canvas
 */
export function applyFiltersPixel(sourceCanvas, filters) {
    const canvas = document.createElement('canvas');
    canvas.width = sourceCanvas.width;
    canvas.height = sourceCanvas.height;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(sourceCanvas, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    const {
        brightness = 100,
        contrast = 100,
        saturation = 100,
        grayscale = 0,
        sepia = 0
    } = filters;

    const brightnessF = brightness / 100;
    const contrastF = (contrast - 100) / 100;
    const saturationF = saturation / 100;
    const grayscaleF = grayscale / 100;
    const sepiaF = sepia / 100;

    for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // Brightness
        r *= brightnessF;
        g *= brightnessF;
        b *= brightnessF;

        // Contrast
        r = ((r / 255 - 0.5) * (1 + contrastF) + 0.5) * 255;
        g = ((g / 255 - 0.5) * (1 + contrastF) + 0.5) * 255;
        b = ((b / 255 - 0.5) * (1 + contrastF) + 0.5) * 255;

        // Grayscale
        if (grayscaleF > 0) {
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            r = r * (1 - grayscaleF) + gray * grayscaleF;
            g = g * (1 - grayscaleF) + gray * grayscaleF;
            b = b * (1 - grayscaleF) + gray * grayscaleF;
        }

        // Sepia
        if (sepiaF > 0) {
            const sr = 0.393 * r + 0.769 * g + 0.189 * b;
            const sg = 0.349 * r + 0.686 * g + 0.168 * b;
            const sb = 0.272 * r + 0.534 * g + 0.131 * b;
            r = r * (1 - sepiaF) + sr * sepiaF;
            g = g * (1 - sepiaF) + sg * sepiaF;
            b = b * (1 - sepiaF) + sb * sepiaF;
        }

        // Saturation
        if (saturationF !== 1) {
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            r = gray + saturationF * (r - gray);
            g = gray + saturationF * (g - gray);
            b = gray + saturationF * (b - gray);
        }

        // Clamp values
        data[i] = Math.max(0, Math.min(255, r));
        data[i + 1] = Math.max(0, Math.min(255, g));
        data[i + 2] = Math.max(0, Math.min(255, b));
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
}

/**
 * Create a canvas from an image file
 * @param {File} file - Image file
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function fileToCanvas(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            resolve(canvas);
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image'));
        };

        img.src = url;
    });
}

/**
 * Get canvas as data URL for preview
 * @param {HTMLCanvasElement} canvas
 * @param {number} maxSize - Max dimension for preview
 * @returns {string} - Data URL
 */
export function canvasToPreviewURL(canvas, maxSize = 400) {
    // Create smaller preview if needed
    if (canvas.width <= maxSize && canvas.height <= maxSize) {
        return canvas.toDataURL('image/jpeg', 0.8);
    }

    const scale = maxSize / Math.max(canvas.width, canvas.height);
    const previewCanvas = document.createElement('canvas');
    previewCanvas.width = Math.round(canvas.width * scale);
    previewCanvas.height = Math.round(canvas.height * scale);

    const ctx = previewCanvas.getContext('2d');
    ctx.drawImage(canvas, 0, 0, previewCanvas.width, previewCanvas.height);

    return previewCanvas.toDataURL('image/jpeg', 0.8);
}

/**
 * Calculate crop area from percentage-based selection
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 * @param {Object} selection - { x, y, width, height } as percentages (0-100)
 * @returns {Object} - Pixel-based crop area
 */
export function percentToCropArea(canvasWidth, canvasHeight, selection) {
    return {
        x: Math.round((selection.x / 100) * canvasWidth),
        y: Math.round((selection.y / 100) * canvasHeight),
        width: Math.round((selection.width / 100) * canvasWidth),
        height: Math.round((selection.height / 100) * canvasHeight)
    };
}

/**
 * Aspect ratio presets for cropping
 */
export const CROP_RATIOS = {
    free: null,
    square: 1,
    '4:3': 4 / 3,
    '3:2': 3 / 2,
    '16:9': 16 / 9,
    '9:16': 9 / 16,
    '3:4': 3 / 4,
    '2:3': 2 / 3
};
