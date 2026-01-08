/**
 * Watermark Module
 * Handles text and image watermark overlay
 */

/**
 * Add text watermark to canvas
 * @param {HTMLCanvasElement} sourceCanvas - Source canvas
 * @param {Object} options - Watermark options
 * @returns {HTMLCanvasElement} - Canvas with watermark
 */
export function addTextWatermark(sourceCanvas, options = {}) {
    const {
        text = 'ImgOpti',
        position = 'bottom-right', // top-left, top-right, bottom-left, bottom-right, center
        fontSize = 24,
        fontFamily = 'Arial, sans-serif',
        color = 'rgba(255, 255, 255, 0.7)',
        backgroundColor = 'rgba(0, 0, 0, 0.3)',
        padding = 10,
        margin = 20,
        rotation = 0,
        opacity = 0.7
    } = options;

    const canvas = document.createElement('canvas');
    canvas.width = sourceCanvas.width;
    canvas.height = sourceCanvas.height;

    const ctx = canvas.getContext('2d');

    // Draw original image
    ctx.drawImage(sourceCanvas, 0, 0);

    // Set up text styling
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    // Measure text
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = fontSize;

    // Calculate position
    let x, y;
    switch (position) {
        case 'top-left':
            x = margin + padding + textWidth / 2;
            y = margin + padding + textHeight / 2;
            break;
        case 'top-right':
            x = canvas.width - margin - padding - textWidth / 2;
            y = margin + padding + textHeight / 2;
            break;
        case 'bottom-left':
            x = margin + padding + textWidth / 2;
            y = canvas.height - margin - padding - textHeight / 2;
            break;
        case 'bottom-right':
            x = canvas.width - margin - padding - textWidth / 2;
            y = canvas.height - margin - padding - textHeight / 2;
            break;
        case 'center':
        default:
            x = canvas.width / 2;
            y = canvas.height / 2;
            break;
    }

    // Apply rotation if needed
    if (rotation !== 0) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.translate(-x, -y);
    }

    // Draw background
    if (backgroundColor) {
        ctx.globalAlpha = opacity;
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(
            x - textWidth / 2 - padding,
            y - textHeight / 2 - padding,
            textWidth + padding * 2,
            textHeight + padding * 2
        );
    }

    // Draw text
    ctx.globalAlpha = opacity;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);

    // Restore context
    ctx.globalAlpha = 1;
    if (rotation !== 0) {
        ctx.restore();
    }

    return canvas;
}

/**
 * Add image watermark to canvas
 * @param {HTMLCanvasElement} sourceCanvas - Source canvas
 * @param {HTMLImageElement|HTMLCanvasElement} watermarkImage - Watermark image
 * @param {Object} options - Watermark options
 * @returns {HTMLCanvasElement} - Canvas with watermark
 */
export function addImageWatermark(sourceCanvas, watermarkImage, options = {}) {
    const {
        position = 'bottom-right',
        scale = 0.15, // Watermark size as percentage of image
        margin = 20,
        opacity = 0.7,
        rotation = 0
    } = options;

    const canvas = document.createElement('canvas');
    canvas.width = sourceCanvas.width;
    canvas.height = sourceCanvas.height;

    const ctx = canvas.getContext('2d');

    // Draw original image
    ctx.drawImage(sourceCanvas, 0, 0);

    // Calculate watermark size
    const maxDimension = Math.max(canvas.width, canvas.height) * scale;
    const watermarkRatio = watermarkImage.width / watermarkImage.height;

    let wmWidth, wmHeight;
    if (watermarkRatio > 1) {
        wmWidth = maxDimension;
        wmHeight = maxDimension / watermarkRatio;
    } else {
        wmHeight = maxDimension;
        wmWidth = maxDimension * watermarkRatio;
    }

    // Calculate position
    let x, y;
    switch (position) {
        case 'top-left':
            x = margin;
            y = margin;
            break;
        case 'top-right':
            x = canvas.width - wmWidth - margin;
            y = margin;
            break;
        case 'bottom-left':
            x = margin;
            y = canvas.height - wmHeight - margin;
            break;
        case 'bottom-right':
            x = canvas.width - wmWidth - margin;
            y = canvas.height - wmHeight - margin;
            break;
        case 'center':
        default:
            x = (canvas.width - wmWidth) / 2;
            y = (canvas.height - wmHeight) / 2;
            break;
    }

    // Apply transformations
    ctx.save();
    ctx.globalAlpha = opacity;

    if (rotation !== 0) {
        const centerX = x + wmWidth / 2;
        const centerY = y + wmHeight / 2;
        ctx.translate(centerX, centerY);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.translate(-centerX, -centerY);
    }

    // Draw watermark
    ctx.drawImage(watermarkImage, x, y, wmWidth, wmHeight);

    ctx.restore();

    return canvas;
}

/**
 * Add tiled watermark pattern
 * @param {HTMLCanvasElement} sourceCanvas - Source canvas
 * @param {string} text - Watermark text
 * @param {Object} options - Options
 * @returns {HTMLCanvasElement} - Canvas with tiled watermark
 */
export function addTiledWatermark(sourceCanvas, text, options = {}) {
    const {
        fontSize = 20,
        fontFamily = 'Arial, sans-serif',
        color = 'rgba(255, 255, 255, 0.15)',
        rotation = -30,
        spacing = 100
    } = options;

    const canvas = document.createElement('canvas');
    canvas.width = sourceCanvas.width;
    canvas.height = sourceCanvas.height;

    const ctx = canvas.getContext('2d');

    // Draw original image
    ctx.drawImage(sourceCanvas, 0, 0);

    // Set up text styling
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Rotate context
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    // Draw tiled pattern
    const diagonal = Math.sqrt(canvas.width ** 2 + canvas.height ** 2);
    const startX = -diagonal / 2;
    const startY = -diagonal / 2;
    const endX = canvas.width + diagonal / 2;
    const endY = canvas.height + diagonal / 2;

    for (let y = startY; y < endY; y += spacing) {
        for (let x = startX; x < endX; x += spacing) {
            ctx.fillText(text, x, y);
        }
    }

    ctx.restore();

    return canvas;
}

/**
 * Load watermark image from file
 * @param {File} file - Image file
 * @returns {Promise<HTMLImageElement>}
 */
export function loadWatermarkImage(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load watermark image'));
        };

        img.src = url;
    });
}

/**
 * Watermark position options
 */
export const WATERMARK_POSITIONS = [
    { value: 'top-left', label: 'Top Left' },
    { value: 'top-right', label: 'Top Right' },
    { value: 'center', label: 'Center' },
    { value: 'bottom-left', label: 'Bottom Left' },
    { value: 'bottom-right', label: 'Bottom Right' }
];
