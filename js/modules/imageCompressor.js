/**
 * Image Compressor Module
 * Wraps browser-image-compression library for compression with Web Workers
 */

import { ImageOptimizerError, ErrorCodes } from './utils.js';

// Library instance
let imageCompression = null;

/**
 * Initialize the compression library
 * @returns {Promise<void>}
 */
async function initLibrary() {
    if (imageCompression) return;

    try {
        const module = await import('browser-image-compression');
        imageCompression = module.default || module;
    } catch (error) {
        console.error('Failed to load compression library:', error);
        throw new ImageOptimizerError(
            'Failed to load compression library',
            ErrorCodes.LIBRARY_LOAD_FAILED
        );
    }
}

/**
 * Compress an image file
 * @param {File|Blob} file - Image file or blob to compress
 * @param {Object} options - Compression options
 * @param {number} options.quality - Quality percentage (0-100)
 * @param {number} options.maxWidth - Maximum width
 * @param {number} options.maxHeight - Maximum height
 * @param {Function} onProgress - Progress callback (0-100)
 * @returns {Promise<Blob>} - Compressed blob
 */
export async function compressImage(file, options = {}, onProgress = null) {
    await initLibrary();

    const {
        quality = 80,
        maxWidth = undefined,
        maxHeight = undefined
    } = options;

    // Convert quality from 0-100 to 0-1
    const normalizedQuality = Math.max(0.1, Math.min(1, quality / 100));

    // Calculate max size based on quality
    // Lower quality = smaller max size allowed
    const maxSizeMB = quality > 70 ? 10 : quality > 40 ? 5 : 2;

    const compressionOptions = {
        maxSizeMB,
        maxWidthOrHeight: maxWidth || maxHeight || 4096,
        useWebWorker: typeof Worker !== 'undefined',
        initialQuality: normalizedQuality,
        alwaysKeepResolution: true,
        onProgress: (progress) => {
            if (onProgress) {
                onProgress(Math.round(progress * 100));
            }
        }
    };

    try {
        // If input is a Blob, convert to File for the library
        let inputFile = file;
        if (file instanceof Blob && !(file instanceof File)) {
            inputFile = new File([file], 'image.jpg', { type: file.type });
        }

        const compressedFile = await imageCompression(inputFile, compressionOptions);
        return compressedFile;

    } catch (error) {
        console.error('Compression error:', error);

        // Try fallback without web worker
        try {
            compressionOptions.useWebWorker = false;
            const compressedFile = await imageCompression(file, compressionOptions);
            return compressedFile;
        } catch (fallbackError) {
            throw new ImageOptimizerError(
                `Compression failed: ${fallbackError.message}`,
                ErrorCodes.COMPRESSION_FAILED
            );
        }
    }
}

/**
 * Compress using canvas only (fallback method)
 * @param {HTMLCanvasElement} canvas - Source canvas
 * @param {string} mimeType - Output MIME type
 * @param {number} quality - Quality (0-100)
 * @returns {Promise<Blob>}
 */
export async function compressWithCanvas(canvas, mimeType = 'image/jpeg', quality = 80) {
    const normalizedQuality = Math.max(0.1, Math.min(1, quality / 100));

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new ImageOptimizerError(
                        'Canvas compression failed',
                        ErrorCodes.COMPRESSION_FAILED
                    ));
                }
            },
            mimeType,
            normalizedQuality
        );
    });
}

/**
 * Estimate compressed size based on quality
 * @param {number} originalSize - Original file size in bytes
 * @param {number} quality - Quality percentage (0-100)
 * @param {string} format - Output format
 * @returns {number} - Estimated size in bytes
 */
export function estimateCompressedSize(originalSize, quality, format = 'webp') {
    // Base compression ratios by format
    const formatRatios = {
        'webp': 0.3,    // WebP is very efficient
        'jpeg': 0.4,    // JPEG good compression
        'jpg': 0.4,
        'png': 0.9,     // PNG lossless, minimal compression
        'gif': 0.95     // GIF mostly unchanged
    };

    const baseRatio = formatRatios[format.toLowerCase()] || 0.5;

    // Quality affects compression ratio
    // Higher quality = less compression = larger file
    const qualityFactor = 0.3 + (quality / 100) * 0.7;

    const estimatedRatio = baseRatio * qualityFactor;
    const estimatedSize = Math.round(originalSize * estimatedRatio);

    // Never estimate larger than original
    return Math.min(estimatedSize, originalSize);
}

/**
 * Check if compression library is available
 * @returns {Promise<boolean>}
 */
export async function isCompressionAvailable() {
    try {
        await initLibrary();
        return true;
    } catch {
        return false;
    }
}
