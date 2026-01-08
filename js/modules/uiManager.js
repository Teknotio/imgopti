/**
 * UI Manager Module
 * Handles screen navigation, DOM updates, and UI bindings
 */

import { state } from './stateManager.js';
import { formatFileSize, debounce } from './utils.js';
import { clearAllFiles, removeFile, getFirstImageData } from './imageLoader.js';

// DOM element references
let elements = {};

/**
 * Initialize UI Manager
 */
export function initUIManager() {
    cacheElements();
    setupEventListeners();
    setupStateSubscriptions();
    updateRangeSliderProgress();
}

/**
 * Cache DOM element references
 */
function cacheElements() {
    elements = {
        // Screens
        screenUpload: document.getElementById('screen-upload'),
        screenEditor: document.getElementById('screen-editor'),
        screenDownload: document.getElementById('screen-download'),

        // Upload screen
        dropZone: document.getElementById('drop-zone'),
        selectedFiles: document.getElementById('selected-files'),
        filesList: document.getElementById('files-list'),
        btnClearFiles: document.getElementById('btn-clear-files'),
        btnContinue: document.getElementById('btn-continue'),
        statCount: document.getElementById('stat-count'),
        statSavings: document.getElementById('stat-savings'),

        // Editor screen
        btnBackToUpload: document.getElementById('btn-back-to-upload'),
        btnResetSettings: document.getElementById('btn-reset-settings'),
        previewImage: document.getElementById('preview-image'),
        fileCountBadge: document.getElementById('file-count-badge'),
        statOriginalSize: document.getElementById('stat-original-size'),
        statNewSize: document.getElementById('stat-new-size'),
        statSavingsPercent: document.getElementById('stat-savings-percent'),
        formatRadios: document.querySelectorAll('input[name="format"]'),
        qualitySlider: document.getElementById('quality-slider'),
        qualityValue: document.getElementById('quality-value'),
        btnUnitPx: document.getElementById('btn-unit-px'),
        btnUnitPercent: document.getElementById('btn-unit-percent'),
        inputWidth: document.getElementById('input-width'),
        inputHeight: document.getElementById('input-height'),
        btnAspectLock: document.getElementById('btn-aspect-lock'),
        checkboxKeepOriginal: document.getElementById('checkbox-keep-original'),
        btnProcess: document.getElementById('btn-process'),
        btnProcessText: document.getElementById('btn-process-text'),

        // Download screen
        btnCloseDownload: document.getElementById('btn-close-download'),
        downloadTotalSaved: document.getElementById('download-total-saved'),
        downloadAvgReduction: document.getElementById('download-avg-reduction'),
        downloadHeadline: document.getElementById('download-headline'),
        resultsList: document.getElementById('results-list'),
        btnDownloadAll: document.getElementById('btn-download-all'),
        btnShareAll: document.getElementById('btn-share-all'),

        // Processing overlay
        processingOverlay: document.getElementById('processing-overlay'),
        processingStatus: document.getElementById('processing-status'),
        processingProgress: document.getElementById('processing-progress')
    };
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    // Upload screen
    elements.btnClearFiles?.addEventListener('click', () => {
        clearAllFiles();
    });

    elements.btnContinue?.addEventListener('click', () => {
        if (state.get('files').length > 0) {
            state.goToScreen('editor');
        }
    });

    // Editor screen
    elements.btnBackToUpload?.addEventListener('click', () => {
        state.goToScreen('upload');
    });

    elements.btnResetSettings?.addEventListener('click', () => {
        state.resetSettings();
        syncUIWithState();
    });

    // Format radios
    elements.formatRadios?.forEach(radio => {
        radio.addEventListener('change', (e) => {
            state.set('settings.format', e.target.value);
        });
    });

    // Quality slider
    elements.qualitySlider?.addEventListener('input', (e) => {
        const quality = parseInt(e.target.value, 10);
        state.set('settings.quality', quality);
        elements.qualityValue.textContent = `${quality}%`;
        updateRangeSliderProgress();
    });

    // Unit toggle
    elements.btnUnitPx?.addEventListener('click', () => {
        setUnit('px');
    });

    elements.btnUnitPercent?.addEventListener('click', () => {
        setUnit('%');
    });

    // Dimension inputs
    const debouncedUpdateDimensions = debounce(updateDimensionsFromInput, 300);

    elements.inputWidth?.addEventListener('input', () => {
        if (!state.get('settings.keepOriginalDimensions')) {
            state.set('settings.resizeEnabled', true);
            debouncedUpdateDimensions('width');
        }
    });

    elements.inputHeight?.addEventListener('input', () => {
        if (!state.get('settings.keepOriginalDimensions')) {
            state.set('settings.resizeEnabled', true);
            debouncedUpdateDimensions('height');
        }
    });

    // Aspect ratio lock
    elements.btnAspectLock?.addEventListener('click', () => {
        const current = state.get('settings.maintainAspectRatio');
        state.set('settings.maintainAspectRatio', !current);
        elements.btnAspectLock.classList.toggle('locked', !current);
    });

    // Keep original dimensions checkbox
    elements.checkboxKeepOriginal?.addEventListener('change', (e) => {
        state.set('settings.keepOriginalDimensions', e.target.checked);
        state.set('settings.resizeEnabled', !e.target.checked);
        elements.inputWidth.disabled = e.target.checked;
        elements.inputHeight.disabled = e.target.checked;
    });

    // Download screen
    elements.btnCloseDownload?.addEventListener('click', () => {
        // Clear files and go back to upload
        state.resetFiles();
        state.goToScreen('upload');
    });
}

/**
 * Set up state subscriptions
 */
function setupStateSubscriptions() {
    // Screen changes
    state.subscribe('currentScreen', (screen) => {
        showScreen(screen);
    });

    // Files changes
    state.subscribe('files', (files) => {
        updateFilesList(files);
        updateSelectedFilesVisibility(files);
        updateFileCountBadge(files);
        updateOriginalSizeStats(files);
    });

    // Processing state
    state.subscribe('processing.isProcessing', (isProcessing) => {
        elements.processingOverlay?.classList.toggle('hidden', !isProcessing);
    });

    state.subscribe('processing', (processing) => {
        if (elements.processingStatus) {
            elements.processingStatus.textContent =
                `Processing ${processing.currentIndex + 1} of ${processing.totalFiles}...`;
        }
        if (elements.processingProgress) {
            elements.processingProgress.style.width = `${processing.progress}%`;
        }
    });

    // Stats
    state.subscribe('stats.processedCount', (count) => {
        if (elements.statCount) {
            elements.statCount.textContent = count.toLocaleString();
        }
    });

    // Settings
    state.subscribe('settings.maintainAspectRatio', (locked) => {
        elements.btnAspectLock?.classList.toggle('locked', locked);
    });

    state.subscribe('settings.keepOriginalDimensions', (keepOriginal) => {
        if (elements.checkboxKeepOriginal) {
            elements.checkboxKeepOriginal.checked = keepOriginal;
        }
        if (elements.inputWidth) {
            elements.inputWidth.disabled = keepOriginal;
        }
        if (elements.inputHeight) {
            elements.inputHeight.disabled = keepOriginal;
        }
    });
}

/**
 * Show a specific screen
 * @param {string} screenName - Screen to show
 */
function showScreen(screenName) {
    // Hide all screens
    elements.screenUpload?.classList.add('hidden');
    elements.screenEditor?.classList.add('hidden');
    elements.screenDownload?.classList.add('hidden');

    // Show target screen
    switch (screenName) {
        case 'upload':
            elements.screenUpload?.classList.remove('hidden');
            break;
        case 'editor':
            elements.screenEditor?.classList.remove('hidden');
            updateEditorPreview();
            break;
        case 'download':
            elements.screenDownload?.classList.remove('hidden');
            break;
    }
}

/**
 * Update the files list in upload screen
 * @param {Array} files - Files array
 */
function updateFilesList(files) {
    if (!elements.filesList) return;

    elements.filesList.innerHTML = files.map(f => `
        <div class="file-item flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-[#16212d] border border-gray-200 dark:border-[#314d68] shadow-sm" data-id="${f.id}">
            <div class="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden shrink-0">
                ${f.thumbnail
                    ? `<img src="${f.thumbnail}" alt="${f.originalName}" class="file-thumbnail"/>`
                    : `<div class="w-full h-full flex items-center justify-center"><span class="material-symbols-outlined text-gray-400">image</span></div>`
                }
            </div>
            <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-slate-900 dark:text-white truncate">${f.originalName}</p>
                <p class="text-xs text-slate-500 dark:text-slate-400">${formatFileSize(f.originalSize)}</p>
            </div>
            <button class="btn-remove-file shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 transition-colors" data-id="${f.id}">
                <span class="material-symbols-outlined text-[20px]">close</span>
            </button>
        </div>
    `).join('');

    // Add remove button listeners
    elements.filesList.querySelectorAll('.btn-remove-file').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            removeFile(id);
        });
    });
}

/**
 * Update selected files section visibility
 * @param {Array} files - Files array
 */
function updateSelectedFilesVisibility(files) {
    if (!elements.selectedFiles) return;
    elements.selectedFiles.classList.toggle('hidden', files.length === 0);
}

/**
 * Update file count badge in editor
 * @param {Array} files - Files array
 */
function updateFileCountBadge(files) {
    if (!elements.fileCountBadge) return;
    const count = files.length;
    elements.fileCountBadge.textContent = `${count} file${count !== 1 ? 's' : ''}`;
}

/**
 * Update original size stats in editor
 * @param {Array} files - Files array
 */
function updateOriginalSizeStats(files) {
    if (!elements.statOriginalSize) return;

    const totalSize = files.reduce((sum, f) => sum + f.originalSize, 0);
    elements.statOriginalSize.textContent = formatFileSize(totalSize);
}

/**
 * Update editor preview with first image
 */
async function updateEditorPreview() {
    const files = state.get('files');
    if (files.length === 0 || !elements.previewImage) return;

    const firstFile = files[0];

    // Set preview image
    if (firstFile.thumbnail) {
        elements.previewImage.style.backgroundImage = `url(${firstFile.thumbnail})`;
        elements.previewImage.innerHTML = '';
    }

    // Load full image dimensions
    try {
        const imageData = await getFirstImageData();
        if (imageData) {
            // Update dimension inputs with original dimensions
            if (elements.inputWidth) {
                elements.inputWidth.value = imageData.width;
                elements.inputWidth.placeholder = imageData.width;
            }
            if (elements.inputHeight) {
                elements.inputHeight.value = imageData.height;
                elements.inputHeight.placeholder = imageData.height;
            }

            // Store original dimensions in state for aspect ratio calculations
            state.set('settings.originalWidth', imageData.width);
            state.set('settings.originalHeight', imageData.height);
            state.set('settings.width', imageData.width);
            state.set('settings.height', imageData.height);
        }
    } catch (error) {
        console.error('Error loading image data:', error);
    }
}

/**
 * Set dimension unit (px or %)
 * @param {string} unit - 'px' or '%'
 */
function setUnit(unit) {
    state.set('settings.unit', unit);

    // Update button styles
    elements.btnUnitPx?.classList.toggle('active', unit === 'px');
    elements.btnUnitPercent?.classList.toggle('active', unit === '%');

    // Update input values
    const originalWidth = state.get('settings.originalWidth') || 1920;
    const originalHeight = state.get('settings.originalHeight') || 1080;

    if (unit === '%') {
        elements.inputWidth.value = 100;
        elements.inputHeight.value = 100;
    } else {
        elements.inputWidth.value = originalWidth;
        elements.inputHeight.value = originalHeight;
    }
}

/**
 * Update dimensions from input (with aspect ratio handling)
 * @param {string} changedField - 'width' or 'height'
 */
function updateDimensionsFromInput(changedField) {
    if (!state.get('settings.maintainAspectRatio')) {
        // Just update the state
        state.set('settings.width', parseInt(elements.inputWidth.value, 10) || 0);
        state.set('settings.height', parseInt(elements.inputHeight.value, 10) || 0);
        return;
    }

    const originalWidth = state.get('settings.originalWidth') || 1920;
    const originalHeight = state.get('settings.originalHeight') || 1080;
    const aspectRatio = originalWidth / originalHeight;

    const unit = state.get('settings.unit');

    if (unit === '%') {
        // In percentage mode, both should match
        const value = parseInt(elements[changedField === 'width' ? 'inputWidth' : 'inputHeight'].value, 10) || 100;
        elements.inputWidth.value = value;
        elements.inputHeight.value = value;
        state.set('settings.width', Math.round(originalWidth * value / 100));
        state.set('settings.height', Math.round(originalHeight * value / 100));
    } else {
        // In pixel mode, calculate the other dimension
        if (changedField === 'width') {
            const newWidth = parseInt(elements.inputWidth.value, 10) || 0;
            const newHeight = Math.round(newWidth / aspectRatio);
            elements.inputHeight.value = newHeight;
            state.set('settings.width', newWidth);
            state.set('settings.height', newHeight);
        } else {
            const newHeight = parseInt(elements.inputHeight.value, 10) || 0;
            const newWidth = Math.round(newHeight * aspectRatio);
            elements.inputWidth.value = newWidth;
            state.set('settings.width', newWidth);
            state.set('settings.height', newHeight);
        }
    }
}

/**
 * Update range slider progress indicator
 */
function updateRangeSliderProgress() {
    if (!elements.qualitySlider) return;

    const value = elements.qualitySlider.value;
    const min = elements.qualitySlider.min || 0;
    const max = elements.qualitySlider.max || 100;
    const progress = ((value - min) / (max - min)) * 100;

    elements.qualitySlider.style.setProperty('--range-progress', `${progress}%`);
}

/**
 * Sync UI with current state
 */
function syncUIWithState() {
    const settings = state.get('settings');

    // Format radio
    elements.formatRadios?.forEach(radio => {
        radio.checked = radio.value === settings.format;
    });

    // Quality
    if (elements.qualitySlider) {
        elements.qualitySlider.value = settings.quality;
        updateRangeSliderProgress();
    }
    if (elements.qualityValue) {
        elements.qualityValue.textContent = `${settings.quality}%`;
    }

    // Dimensions
    if (elements.inputWidth) {
        elements.inputWidth.value = settings.width || settings.originalWidth || 1920;
    }
    if (elements.inputHeight) {
        elements.inputHeight.value = settings.height || settings.originalHeight || 1080;
    }

    // Keep original
    if (elements.checkboxKeepOriginal) {
        elements.checkboxKeepOriginal.checked = settings.keepOriginalDimensions;
    }

    // Aspect ratio lock
    elements.btnAspectLock?.classList.toggle('locked', settings.maintainAspectRatio);
}

/**
 * Update download screen results
 * @param {Array} results - Processed files with results
 */
export function updateDownloadResults(results) {
    if (!elements.resultsList) return;

    // Calculate totals
    let totalOriginal = 0;
    let totalNew = 0;

    results.forEach(r => {
        totalOriginal += r.originalSize;
        totalNew += r.newSize;
    });

    const totalSaved = totalOriginal - totalNew;
    const avgReduction = totalOriginal > 0
        ? Math.round((totalSaved / totalOriginal) * 100)
        : 0;

    // Update stats
    if (elements.downloadTotalSaved) {
        elements.downloadTotalSaved.textContent = formatFileSize(totalSaved);
    }
    if (elements.downloadAvgReduction) {
        elements.downloadAvgReduction.textContent = `${avgReduction}%`;
    }
    if (elements.downloadHeadline) {
        elements.downloadHeadline.textContent = `${results.length} Image${results.length !== 1 ? 's' : ''} Ready`;
    }

    // Render results list
    elements.resultsList.innerHTML = results.map((r, index) => `
        <div class="result-item group flex items-center gap-4 bg-surface-light dark:bg-surface-dark p-3 pr-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50 transition-all active:scale-[0.99]" data-index="${index}">
            <div class="relative shrink-0">
                <div class="bg-center bg-no-repeat bg-cover rounded-lg size-16 shadow-inner" style="background-image: url('${r.thumbnail || ''}');">
                    ${!r.thumbnail ? '<div class="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg"><span class="material-symbols-outlined text-gray-400">image</span></div>' : ''}
                </div>
                <div class="absolute -bottom-1 -right-1 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">${r.format.toUpperCase()}</div>
            </div>
            <div class="flex flex-col flex-1 min-w-0 justify-center gap-0.5">
                <p class="text-slate-900 dark:text-white text-base font-semibold leading-snug truncate">${r.newName}</p>
                <div class="flex items-center gap-2 text-xs">
                    <span class="text-slate-400 line-through">${formatFileSize(r.originalSize)}</span>
                    <span class="material-symbols-outlined text-[10px] text-slate-500">arrow_forward</span>
                    <span class="text-primary font-bold">${formatFileSize(r.newSize)}</span>
                    <span class="text-green-500 font-medium">(-${r.savings}%)</span>
                </div>
            </div>
            <button class="btn-download-single shrink-0 size-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-primary hover:bg-primary hover:text-white transition-colors" data-index="${index}">
                <span class="material-symbols-outlined">download</span>
            </button>
        </div>
    `).join('');
}

/**
 * Show processing overlay
 */
export function showProcessingOverlay() {
    elements.processingOverlay?.classList.remove('hidden');
}

/**
 * Hide processing overlay
 */
export function hideProcessingOverlay() {
    elements.processingOverlay?.classList.add('hidden');
}

/**
 * Update processing status text
 * @param {string} text - Status text
 */
export function updateProcessingStatus(text) {
    if (elements.processingStatus) {
        elements.processingStatus.textContent = text;
    }
}

/**
 * Update processing progress bar
 * @param {number} percent - Progress percentage (0-100)
 */
export function updateProcessingProgress(percent) {
    if (elements.processingProgress) {
        elements.processingProgress.style.width = `${percent}%`;
    }
}

/**
 * Get current settings from UI
 * @returns {Object} - Settings object
 */
export function getCurrentSettings() {
    return state.get('settings');
}
