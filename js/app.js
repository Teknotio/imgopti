/**
 * ImgOpti - Main Application Entry Point
 * Orchestrates all modules and handles the main processing pipeline
 */

import { state } from './modules/stateManager.js';
import { initImageLoader } from './modules/imageLoader.js';
import { initUIManager, updateDownloadResults, showProcessingOverlay, hideProcessingOverlay, updateProcessingStatus, updateProcessingProgress, getCurrentSettings } from './modules/uiManager.js';
import { processImage } from './modules/imageProcessor.js';
import { compressImage, compressWithCanvas } from './modules/imageCompressor.js';
import { convertFormat, generateOutputFilename } from './modules/formatConverter.js';
import { initDownloadManager, setProcessedResults, createResultObject, clearProcessedResults } from './modules/downloadManager.js';
import { showToast, checkBrowserSupport, createThumbnail, getMimeType, calculateSavings, sleep } from './modules/utils.js';

/**
 * Initialize the application
 */
async function init() {
    console.log('ImgOpti initializing...');

    // Check browser support
    const support = checkBrowserSupport();
    if (!support.canvas) {
        showToast('Your browser does not support image processing', 'error', 10000);
        return;
    }

    if (!support.webp) {
        console.warn('WebP not supported, falling back to JPEG for WebP conversions');
    }

    // Initialize all modules
    initImageLoader();
    initUIManager();
    initDownloadManager();

    // Set up process button handler
    setupProcessButton();

    // Initialize dark mode
    initDarkMode();

    console.log('ImgOpti initialized successfully');
}

/**
 * Set up the process button click handler
 */
function setupProcessButton() {
    const btnProcess = document.getElementById('btn-process');
    btnProcess?.addEventListener('click', async () => {
        const files = state.get('files');
        if (files.length === 0) {
            showToast('No files to process', 'error');
            return;
        }

        await processAllFiles();
    });
}

/**
 * Process all files in the queue
 */
async function processAllFiles() {
    const files = state.get('files');
    const settings = getCurrentSettings();

    if (files.length === 0) return;

    // Show processing overlay
    state.startProcessing();
    showProcessingOverlay();

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < files.length; i++) {
        const fileData = files[i];
        updateProcessingStatus(`Processing ${i + 1} of ${files.length}...`);
        updateProcessingProgress(Math.round((i / files.length) * 100));

        try {
            // Update file status
            state.updateFile(fileData.id, { status: 'processing' });

            // Process the file
            const result = await processSingleFile(fileData, settings);
            results.push(result);

            // Update file status
            state.updateFile(fileData.id, { status: 'done', result });

            // Update stats
            state.incrementProcessedCount();
            const saved = fileData.originalSize - result.newSize;
            if (saved > 0) {
                state.addSavedBytes(saved);
            }

            successCount++;

        } catch (error) {
            console.error(`Error processing ${fileData.originalName}:`, error);

            // Update file status
            state.updateFile(fileData.id, { status: 'error', error: error.message });

            errorCount++;
        }

        // Small delay between files to prevent UI freezing
        await sleep(50);
    }

    // Update progress to 100%
    updateProcessingProgress(100);
    updateProcessingStatus('Complete!');

    // Hide processing overlay after a moment
    await sleep(500);
    hideProcessingOverlay();
    state.endProcessing();

    // Store results for download
    setProcessedResults(results);

    // Show results
    if (successCount > 0) {
        // Update download screen with results
        updateDownloadResults(results);

        // Navigate to download screen
        state.goToScreen('download');

        showToast(`${successCount} image${successCount > 1 ? 's' : ''} optimized successfully!`, 'success');
    }

    if (errorCount > 0) {
        showToast(`${errorCount} file${errorCount > 1 ? 's' : ''} failed to process`, 'error');
    }
}

/**
 * Process a single file
 * @param {Object} fileData - File data from state
 * @param {Object} settings - Processing settings
 * @returns {Promise<Object>} - Result object
 */
async function processSingleFile(fileData, settings) {
    const { file, originalSize, originalName, thumbnail } = fileData;

    // Step 1: Process image (resize + EXIF fix)
    const processedData = await processImage(file, {
        resizeEnabled: settings.resizeEnabled && !settings.keepOriginalDimensions,
        width: settings.width,
        height: settings.height,
        unit: settings.unit,
        maintainAspectRatio: settings.maintainAspectRatio,
        keepOriginalDimensions: settings.keepOriginalDimensions
    });

    // Step 2: Get target format and MIME type
    const targetFormat = settings.format || 'webp';
    const targetMime = getMimeType(targetFormat);

    // Step 3: Convert canvas to blob with initial quality
    let blob = await canvasToBlob(processedData.canvas, targetMime, settings.quality);

    // Step 4: Apply compression for further size reduction
    try {
        const compressedBlob = await compressImage(blob, {
            quality: settings.quality,
            maxWidth: processedData.width,
            maxHeight: processedData.height
        });

        // Use compressed version if it's smaller
        if (compressedBlob.size < blob.size) {
            blob = compressedBlob;
        }
    } catch (compressionError) {
        console.warn('Advanced compression failed, using canvas output:', compressionError);
        // Continue with canvas-compressed blob
    }

    // Step 5: Ensure correct format (if compression changed it)
    if (blob.type !== targetMime) {
        blob = await convertFormat(blob, targetFormat, settings.quality);
    }

    // Create result object
    return createResultObject({
        blob,
        originalName,
        originalSize,
        format: targetFormat,
        thumbnail
    });
}

/**
 * Convert canvas to blob
 * @param {HTMLCanvasElement} canvas
 * @param {string} mimeType
 * @param {number} quality - 0-100
 * @returns {Promise<Blob>}
 */
function canvasToBlob(canvas, mimeType, quality) {
    const normalizedQuality = Math.max(0.1, Math.min(1, quality / 100));

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Failed to create blob from canvas'));
                }
            },
            mimeType,
            normalizedQuality
        );
    });
}

/**
 * Initialize dark mode handling
 */
function initDarkMode() {
    // Check system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Check if already set in HTML
    const htmlElement = document.documentElement;
    const currentMode = htmlElement.classList.contains('dark');

    // Apply system preference if not already set
    if (!currentMode && prefersDark) {
        htmlElement.classList.add('dark');
    }

    // Listen for system preference changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (e.matches) {
            htmlElement.classList.add('dark');
        } else {
            htmlElement.classList.remove('dark');
        }
    });

    // Settings button toggle (optional feature)
    const btnSettings = document.getElementById('btn-settings');
    btnSettings?.addEventListener('click', () => {
        htmlElement.classList.toggle('dark');
        const isDark = htmlElement.classList.contains('dark');
        showToast(`${isDark ? 'Dark' : 'Light'} mode enabled`, 'info', 1500);
    });
}

/**
 * Handle app state reset (new session)
 */
function resetApp() {
    clearProcessedResults();
    state.resetFiles();
    state.goToScreen('upload');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Expose reset function globally for debugging
window.resetImgOpti = resetApp;
