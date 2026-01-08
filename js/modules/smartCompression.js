/**
 * Smart Compression Module
 * Automatically finds optimal quality for target file size
 */

/**
 * Find optimal quality to achieve target file size
 * @param {HTMLCanvasElement} canvas - Source canvas
 * @param {string} format - Output format (jpeg, webp, png)
 * @param {number} targetSizeKB - Target size in KB
 * @param {Object} options - Options
 * @returns {Promise<{blob: Blob, quality: number, iterations: number}>}
 */
export async function findOptimalQuality(canvas, format, targetSizeKB, options = {}) {
    const {
        minQuality = 10,
        maxQuality = 95,
        tolerance = 0.1, // 10% tolerance
        maxIterations = 10
    } = options;

    const targetBytes = targetSizeKB * 1024;
    const mimeType = `image/${format === 'jpg' ? 'jpeg' : format}`;

    // PNG is lossless, can't optimize quality
    if (format === 'png') {
        const blob = await canvasToBlob(canvas, mimeType, 1);
        return { blob, quality: 100, iterations: 1 };
    }

    let low = minQuality;
    let high = maxQuality;
    let bestBlob = null;
    let bestQuality = maxQuality;
    let iterations = 0;

    // Binary search for optimal quality
    while (low <= high && iterations < maxIterations) {
        iterations++;
        const mid = Math.round((low + high) / 2);
        const quality = mid / 100;

        const blob = await canvasToBlob(canvas, mimeType, quality);
        const size = blob.size;

        // Check if within tolerance
        const lowerBound = targetBytes * (1 - tolerance);
        const upperBound = targetBytes * (1 + tolerance);

        if (size >= lowerBound && size <= upperBound) {
            return { blob, quality: mid, iterations };
        }

        if (size > targetBytes) {
            // File too big, reduce quality
            high = mid - 1;
            bestBlob = blob;
            bestQuality = mid;
        } else {
            // File too small, increase quality
            low = mid + 1;
            bestBlob = blob;
            bestQuality = mid;
        }
    }

    // Return best result found
    if (!bestBlob) {
        bestBlob = await canvasToBlob(canvas, mimeType, bestQuality / 100);
    }

    return { blob: bestBlob, quality: bestQuality, iterations };
}

/**
 * Auto-optimize image based on content analysis
 * @param {HTMLCanvasElement} canvas - Source canvas
 * @param {Object} options - Options
 * @returns {Promise<{format: string, quality: number, blob: Blob}>}
 */
export async function autoOptimize(canvas, options = {}) {
    const {
        preferSmallSize = true,
        maxSizeKB = null
    } = options;

    // Analyze image content
    const analysis = analyzeImage(canvas);

    // Determine best format
    let format = 'webp'; // Default to WebP for best compression

    // Check WebP support
    const supportsWebP = checkWebPSupport();
    if (!supportsWebP) {
        format = 'jpeg';
    }

    // Use PNG for images with transparency or few colors (graphics)
    if (analysis.hasTransparency) {
        format = 'png';
    } else if (analysis.colorCount < 256 && analysis.isGraphic) {
        format = 'png';
    }

    // Determine quality based on content
    let quality = 85;

    if (analysis.isPhoto) {
        // Photos can handle more compression
        quality = preferSmallSize ? 75 : 85;
    } else if (analysis.isGraphic) {
        // Graphics need higher quality
        quality = preferSmallSize ? 85 : 95;
    }

    // If max size specified, find optimal quality
    if (maxSizeKB && format !== 'png') {
        const result = await findOptimalQuality(canvas, format, maxSizeKB, {
            minQuality: 30,
            maxQuality: quality
        });
        return {
            format,
            quality: result.quality,
            blob: result.blob,
            analysis
        };
    }

    // Generate blob with determined settings
    const mimeType = `image/${format === 'jpg' ? 'jpeg' : format}`;
    const blob = await canvasToBlob(canvas, mimeType, quality / 100);

    return { format, quality, blob, analysis };
}

/**
 * Analyze image content
 * @param {HTMLCanvasElement} canvas
 * @returns {Object} - Analysis results
 */
function analyzeImage(canvas) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    let hasTransparency = false;
    const colorSet = new Set();
    let totalVariance = 0;
    let pixelCount = 0;

    // Sample pixels (every 10th pixel for performance)
    for (let i = 0; i < data.length; i += 40) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        // Check transparency
        if (a < 255) {
            hasTransparency = true;
        }

        // Track unique colors (quantized to reduce count)
        const quantizedColor = `${Math.floor(r / 16)},${Math.floor(g / 16)},${Math.floor(b / 16)}`;
        colorSet.add(quantizedColor);

        // Calculate local variance (for photo vs graphic detection)
        if (i > 0) {
            const prevR = data[i - 40];
            const prevG = data[i - 39];
            const prevB = data[i - 38];
            const diff = Math.abs(r - prevR) + Math.abs(g - prevG) + Math.abs(b - prevB);
            totalVariance += diff;
        }
        pixelCount++;
    }

    const colorCount = colorSet.size;
    const avgVariance = totalVariance / Math.max(1, pixelCount);

    // Heuristics
    const isPhoto = avgVariance > 30 && colorCount > 1000;
    const isGraphic = avgVariance < 20 || colorCount < 500;

    return {
        hasTransparency,
        colorCount,
        avgVariance,
        isPhoto,
        isGraphic,
        width: canvas.width,
        height: canvas.height,
        totalPixels: canvas.width * canvas.height
    };
}

/**
 * Check WebP support
 * @returns {boolean}
 */
function checkWebPSupport() {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').startsWith('data:image/webp');
}

/**
 * Canvas to blob helper
 * @param {HTMLCanvasElement} canvas
 * @param {string} mimeType
 * @param {number} quality
 * @returns {Promise<Blob>}
 */
function canvasToBlob(canvas, mimeType, quality) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Failed to create blob'));
                }
            },
            mimeType,
            quality
        );
    });
}

/**
 * Get compression recommendations
 * @param {number} originalSizeKB - Original file size in KB
 * @param {string} usage - 'web', 'email', 'social', 'print'
 * @returns {Object} - Recommendations
 */
export function getRecommendations(originalSizeKB, usage = 'web') {
    const recommendations = {
        web: {
            targetSizeKB: Math.min(originalSizeKB, 200),
            format: 'webp',
            quality: 80,
            maxWidth: 1920
        },
        email: {
            targetSizeKB: Math.min(originalSizeKB, 500),
            format: 'jpeg',
            quality: 75,
            maxWidth: 1200
        },
        social: {
            targetSizeKB: Math.min(originalSizeKB, 1000),
            format: 'jpeg',
            quality: 85,
            maxWidth: 1080
        },
        print: {
            targetSizeKB: originalSizeKB, // No compression
            format: 'png',
            quality: 100,
            maxWidth: null
        }
    };

    return recommendations[usage] || recommendations.web;
}
