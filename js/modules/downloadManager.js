/**
 * Download Manager Module
 * Handles single file downloads and batch ZIP downloads
 */

import { showToast, formatFileSize } from './utils.js';

// Store processed results for download
let processedResults = [];

/**
 * Set processed results for download
 * @param {Array} results - Array of processed file results
 */
export function setProcessedResults(results) {
    processedResults = results;
}

/**
 * Get processed results
 * @returns {Array}
 */
export function getProcessedResults() {
    return processedResults;
}

/**
 * Download a single file
 * @param {Blob} blob - File blob to download
 * @param {string} filename - Filename for download
 */
export function downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Revoke URL after a delay to ensure download starts
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Download a single file by index
 * @param {number} index - Index in processedResults array
 */
export function downloadSingleFile(index) {
    const result = processedResults[index];
    if (!result || !result.blob) {
        showToast('File not available', 'error');
        return;
    }

    downloadFile(result.blob, result.newName);
    showToast(`Downloaded ${result.newName}`, 'success');
}

/**
 * Download all files as a ZIP
 */
export async function downloadAllAsZip() {
    if (processedResults.length === 0) {
        showToast('No files to download', 'error');
        return;
    }

    try {
        showToast('Creating ZIP file...', 'info');

        // Import JSZip
        const JSZip = await import('jszip');
        const zip = new JSZip.default();

        // Add all files to ZIP
        for (const result of processedResults) {
            if (result.blob) {
                zip.file(result.newName, result.blob);
            }
        }

        // Generate ZIP blob
        const zipBlob = await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
        }, (metadata) => {
            // Progress callback
            if (metadata.percent) {
                // Could update UI here if needed
            }
        });

        // Generate filename with timestamp
        const timestamp = new Date().toISOString().slice(0, 10);
        const filename = `imgopti_optimized_${timestamp}.zip`;

        // Download the ZIP
        downloadFile(zipBlob, filename);
        showToast(`Downloaded ${processedResults.length} images as ZIP`, 'success');

    } catch (error) {
        console.error('ZIP creation error:', error);
        showToast('Failed to create ZIP file', 'error');

        // Fallback: download files individually
        showToast('Downloading files individually...', 'info');
        for (const result of processedResults) {
            if (result.blob) {
                downloadFile(result.blob, result.newName);
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
    }
}

/**
 * Share all files using Web Share API
 */
export async function shareAllFiles() {
    if (!navigator.share) {
        showToast('Sharing not supported on this device', 'error');
        return;
    }

    if (processedResults.length === 0) {
        showToast('No files to share', 'error');
        return;
    }

    try {
        // Convert blobs to files for sharing
        const files = processedResults
            .filter(r => r.blob)
            .map(r => new File([r.blob], r.newName, { type: r.blob.type }));

        if (files.length === 0) {
            showToast('No files available to share', 'error');
            return;
        }

        // Check if file sharing is supported
        if (navigator.canShare && navigator.canShare({ files })) {
            await navigator.share({
                files,
                title: 'Optimized Images',
                text: `${files.length} optimized image${files.length > 1 ? 's' : ''} from ImgOpti`
            });
            showToast('Shared successfully!', 'success');
        } else {
            // Fallback: share as text with download link
            showToast('File sharing not supported, please download instead', 'info');
        }

    } catch (error) {
        if (error.name === 'AbortError') {
            // User cancelled sharing
            return;
        }
        console.error('Share error:', error);
        showToast('Failed to share files', 'error');
    }
}

/**
 * Clear processed results
 */
export function clearProcessedResults() {
    // Revoke any object URLs
    processedResults.forEach(result => {
        if (result.objectUrl) {
            URL.revokeObjectURL(result.objectUrl);
        }
    });
    processedResults = [];
}

/**
 * Create a result object for a processed file
 * @param {Object} params
 * @param {Blob} params.blob - Processed blob
 * @param {string} params.originalName - Original filename
 * @param {number} params.originalSize - Original size in bytes
 * @param {string} params.format - Output format
 * @param {string} params.thumbnail - Thumbnail data URL
 * @returns {Object} - Result object
 */
export function createResultObject({
    blob,
    originalName,
    originalSize,
    format,
    thumbnail
}) {
    const newSize = blob.size;
    const savings = originalSize > 0
        ? Math.round(((originalSize - newSize) / originalSize) * 100)
        : 0;

    // Generate new filename
    const dotIndex = originalName.lastIndexOf('.');
    const baseName = dotIndex !== -1 ? originalName.slice(0, dotIndex) : originalName;
    const ext = format === 'jpeg' ? 'jpg' : format;
    const newName = `${baseName}_optimized.${ext}`;

    return {
        blob,
        originalName,
        originalSize,
        newName,
        newSize,
        format,
        savings: Math.max(0, savings),
        thumbnail,
        objectUrl: null // Can be set later if needed for preview
    };
}

/**
 * Get download statistics
 * @returns {Object} - Stats object
 */
export function getDownloadStats() {
    if (processedResults.length === 0) {
        return {
            totalFiles: 0,
            totalOriginalSize: 0,
            totalNewSize: 0,
            totalSaved: 0,
            averageReduction: 0
        };
    }

    const totalOriginalSize = processedResults.reduce((sum, r) => sum + r.originalSize, 0);
    const totalNewSize = processedResults.reduce((sum, r) => sum + r.newSize, 0);
    const totalSaved = totalOriginalSize - totalNewSize;
    const averageReduction = totalOriginalSize > 0
        ? Math.round((totalSaved / totalOriginalSize) * 100)
        : 0;

    return {
        totalFiles: processedResults.length,
        totalOriginalSize,
        totalNewSize,
        totalSaved,
        averageReduction,
        totalOriginalSizeFormatted: formatFileSize(totalOriginalSize),
        totalNewSizeFormatted: formatFileSize(totalNewSize),
        totalSavedFormatted: formatFileSize(totalSaved)
    };
}

/**
 * Initialize download manager event listeners
 */
export function initDownloadManager() {
    // Download all button
    const btnDownloadAll = document.getElementById('btn-download-all');
    btnDownloadAll?.addEventListener('click', downloadAllAsZip);

    // Share all button
    const btnShareAll = document.getElementById('btn-share-all');
    btnShareAll?.addEventListener('click', shareAllFiles);

    // Single download buttons (delegated)
    const resultsList = document.getElementById('results-list');
    resultsList?.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-download-single');
        if (btn) {
            const index = parseInt(btn.dataset.index, 10);
            downloadSingleFile(index);
        }
    });
}
