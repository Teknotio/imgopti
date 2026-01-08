/**
 * Text Recognition (OCR) Module
 * Extract text from images using Tesseract.js
 */

const TESSERACT_URL = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';

let Tesseract = null;
let worker = null;

/**
 * Load Tesseract.js library
 * @returns {Promise<boolean>}
 */
export async function loadTesseract() {
    if (Tesseract) return true;

    try {
        if (!window.Tesseract) {
            await loadScript(TESSERACT_URL);
        }
        Tesseract = window.Tesseract;
        return true;
    } catch (error) {
        console.error('Failed to load Tesseract.js:', error);
        return false;
    }
}

/**
 * Load external script
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
 * Initialize worker
 * @param {string} language - Language code (e.g., 'eng', 'spa', 'fra')
 * @param {Function} onProgress - Progress callback
 * @returns {Promise}
 */
async function initWorker(language = 'eng', onProgress = () => {}) {
    if (!Tesseract) {
        const loaded = await loadTesseract();
        if (!loaded) throw new Error('Failed to load Tesseract');
    }

    if (worker) {
        await worker.terminate();
    }

    worker = await Tesseract.createWorker(language, 1, {
        logger: (m) => {
            if (m.status === 'recognizing text') {
                onProgress('Recognizing text...', Math.round(m.progress * 100));
            } else {
                onProgress(m.status, 0);
            }
        }
    });

    return worker;
}

/**
 * Supported languages
 */
export const LANGUAGES = {
    eng: 'English',
    spa: 'Spanish',
    fra: 'French',
    deu: 'German',
    ita: 'Italian',
    por: 'Portuguese',
    rus: 'Russian',
    jpn: 'Japanese',
    kor: 'Korean',
    chi_sim: 'Chinese (Simplified)',
    chi_tra: 'Chinese (Traditional)',
    ara: 'Arabic',
    hin: 'Hindi'
};

/**
 * Recognize text from image
 * @param {HTMLImageElement|HTMLCanvasElement|string} image - Image source
 * @param {Object} options - Options
 * @returns {Promise<Object>} - Recognition result
 */
export async function recognizeText(image, options = {}) {
    const {
        language = 'eng',
        onProgress = () => {}
    } = options;

    onProgress('Initializing OCR...', 0);

    await initWorker(language, onProgress);

    onProgress('Processing image...', 10);

    const result = await worker.recognize(image);

    return {
        text: result.data.text,
        confidence: result.data.confidence,
        blocks: result.data.blocks,
        lines: result.data.lines,
        words: result.data.words,
        symbols: result.data.symbols
    };
}

/**
 * Get bounding boxes for detected text
 * @param {Object} result - Recognition result
 * @param {string} level - 'blocks', 'lines', 'words', or 'symbols'
 * @returns {Array} - Array of bounding boxes
 */
export function getBoundingBoxes(result, level = 'words') {
    const items = result[level] || [];
    return items.map(item => ({
        text: item.text,
        confidence: item.confidence,
        bbox: item.bbox
    }));
}

/**
 * Create OCR UI panel
 * @param {Object} options - Configuration options
 * @returns {Object} - UI controller
 */
export function createOCRPanel(options = {}) {
    const {
        container,
        onTextExtracted = () => {}
    } = options;

    let sourceImage = null;
    let lastResult = null;

    // Create UI
    const panel = document.createElement('div');
    panel.className = 'ocr-panel';
    panel.innerHTML = `
        <div class="ocr-header">
            <span class="material-symbols-outlined">text_fields</span>
            <span>Text Recognition (OCR)</span>
        </div>
        <div class="ocr-preview">
            <div class="preview-placeholder">
                <span class="material-symbols-outlined">image_search</span>
                <span>Select an image to extract text</span>
            </div>
            <div class="preview-container" style="display: none;">
                <canvas class="preview-canvas"></canvas>
                <div class="text-overlay"></div>
            </div>
        </div>
        <div class="ocr-settings">
            <div class="setting-row">
                <span>Language</span>
                <select class="language-select">
                    ${Object.entries(LANGUAGES).map(([code, name]) => `
                        <option value="${code}" ${code === 'eng' ? 'selected' : ''}>${name}</option>
                    `).join('')}
                </select>
            </div>
            <div class="setting-row">
                <span>Show Highlights</span>
                <label class="toggle">
                    <input type="checkbox" class="highlight-toggle" checked>
                    <span class="toggle-slider"></span>
                </label>
            </div>
        </div>
        <div class="ocr-progress" style="display: none;">
            <div class="progress-bar">
                <div class="progress-fill"></div>
            </div>
            <div class="progress-text">Initializing...</div>
        </div>
        <div class="ocr-result" style="display: none;">
            <div class="result-header">
                <span>Extracted Text</span>
                <div class="result-actions">
                    <button class="result-btn copy-btn" title="Copy to clipboard">
                        <span class="material-symbols-outlined">content_copy</span>
                    </button>
                    <button class="result-btn download-btn" title="Download as text file">
                        <span class="material-symbols-outlined">download</span>
                    </button>
                </div>
            </div>
            <div class="result-stats">
                <span class="stat">Confidence: <strong class="confidence-value">0%</strong></span>
                <span class="stat">Words: <strong class="word-count">0</strong></span>
            </div>
            <textarea class="result-text" readonly></textarea>
        </div>
        <div class="ocr-actions">
            <button class="action-btn extract-btn primary" disabled>
                <span class="material-symbols-outlined">document_scanner</span>
                Extract Text
            </button>
        </div>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .ocr-panel {
            background: rgba(16, 25, 34, 0.95);
            border-radius: 16px;
            padding: 20px;
            width: 100%;
            max-width: 600px;
        }
        .ocr-header {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 18px;
            font-weight: 600;
            color: white;
            margin-bottom: 16px;
        }
        .ocr-preview {
            background: #1a2634;
            border-radius: 12px;
            min-height: 200px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 16px;
            overflow: hidden;
            position: relative;
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
        .preview-container {
            width: 100%;
            position: relative;
        }
        .preview-canvas {
            width: 100%;
            display: block;
        }
        .text-overlay {
            position: absolute;
            inset: 0;
            pointer-events: none;
        }
        .text-box {
            position: absolute;
            background: rgba(13, 127, 242, 0.2);
            border: 1px solid rgba(13, 127, 242, 0.5);
            pointer-events: auto;
            cursor: pointer;
        }
        .text-box:hover {
            background: rgba(13, 127, 242, 0.4);
        }
        .text-box-tooltip {
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.9);
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            white-space: nowrap;
            opacity: 0;
            transition: opacity 0.15s;
            z-index: 10;
        }
        .text-box:hover .text-box-tooltip {
            opacity: 1;
        }
        .ocr-settings {
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
        .language-select {
            background: #374151;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 6px;
            cursor: pointer;
        }
        .toggle {
            position: relative;
            width: 44px;
            height: 24px;
        }
        .toggle input {
            opacity: 0;
            width: 0;
            height: 0;
        }
        .toggle-slider {
            position: absolute;
            inset: 0;
            background: #374151;
            border-radius: 24px;
            transition: 0.2s;
            cursor: pointer;
        }
        .toggle-slider::before {
            content: '';
            position: absolute;
            width: 18px;
            height: 18px;
            left: 3px;
            bottom: 3px;
            background: white;
            border-radius: 50%;
            transition: 0.2s;
        }
        .toggle input:checked + .toggle-slider {
            background: #0d7ff2;
        }
        .toggle input:checked + .toggle-slider::before {
            transform: translateX(20px);
        }
        .ocr-progress {
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
        .ocr-result {
            background: #1a2634;
            border-radius: 12px;
            padding: 12px;
            margin-bottom: 16px;
        }
        .result-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            color: white;
            font-weight: 500;
        }
        .result-actions {
            display: flex;
            gap: 4px;
        }
        .result-btn {
            background: transparent;
            border: none;
            color: #9ca3af;
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
        }
        .result-btn:hover {
            background: rgba(255,255,255,0.1);
            color: white;
        }
        .result-stats {
            display: flex;
            gap: 16px;
            margin-bottom: 12px;
        }
        .stat {
            font-size: 12px;
            color: #6b7280;
        }
        .stat strong {
            color: #0d7ff2;
        }
        .result-text {
            width: 100%;
            min-height: 120px;
            background: #101922;
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 8px;
            padding: 12px;
            color: white;
            font-size: 13px;
            line-height: 1.6;
            resize: vertical;
        }
        .ocr-actions {
            display: flex;
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
    `;
    document.head.appendChild(style);

    const previewCanvas = panel.querySelector('.preview-canvas');
    const previewCtx = previewCanvas.getContext('2d');
    const textOverlay = panel.querySelector('.text-overlay');
    const progressBar = panel.querySelector('.ocr-progress');
    const progressFill = panel.querySelector('.progress-fill');
    const progressText = panel.querySelector('.progress-text');
    const resultSection = panel.querySelector('.ocr-result');
    const resultText = panel.querySelector('.result-text');
    const extractBtn = panel.querySelector('.extract-btn');

    // Extract button
    extractBtn.addEventListener('click', async () => {
        if (!sourceImage) return;

        extractBtn.disabled = true;
        progressBar.style.display = 'block';
        resultSection.style.display = 'none';

        try {
            const language = panel.querySelector('.language-select').value;

            lastResult = await recognizeText(sourceImage, {
                language,
                onProgress: (text, percent) => {
                    progressFill.style.width = `${percent}%`;
                    progressText.textContent = text;
                }
            });

            // Show result
            resultSection.style.display = 'block';
            resultText.value = lastResult.text;
            panel.querySelector('.confidence-value').textContent =
                `${Math.round(lastResult.confidence)}%`;
            panel.querySelector('.word-count').textContent =
                lastResult.words?.length || 0;

            // Show highlights
            if (panel.querySelector('.highlight-toggle').checked) {
                showHighlights(lastResult);
            }

            onTextExtracted(lastResult);
        } catch (error) {
            progressText.textContent = 'Error: ' + error.message;
        }

        extractBtn.disabled = false;
    });

    // Copy button
    panel.querySelector('.copy-btn').addEventListener('click', () => {
        navigator.clipboard.writeText(resultText.value);
        showToast('Copied to clipboard!');
    });

    // Download button
    panel.querySelector('.download-btn').addEventListener('click', () => {
        const blob = new Blob([resultText.value], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'extracted-text.txt';
        a.click();
        URL.revokeObjectURL(url);
    });

    // Highlight toggle
    panel.querySelector('.highlight-toggle').addEventListener('change', (e) => {
        if (e.target.checked && lastResult) {
            showHighlights(lastResult);
        } else {
            textOverlay.innerHTML = '';
        }
    });

    function showHighlights(result) {
        textOverlay.innerHTML = '';

        const canvasRect = previewCanvas.getBoundingClientRect();
        const scaleX = canvasRect.width / previewCanvas.width;
        const scaleY = canvasRect.height / previewCanvas.height;

        (result.words || []).forEach(word => {
            if (word.confidence < 50) return;

            const box = document.createElement('div');
            box.className = 'text-box';
            box.style.left = `${word.bbox.x0 * scaleX}px`;
            box.style.top = `${word.bbox.y0 * scaleY}px`;
            box.style.width = `${(word.bbox.x1 - word.bbox.x0) * scaleX}px`;
            box.style.height = `${(word.bbox.y1 - word.bbox.y0) * scaleY}px`;

            box.innerHTML = `<div class="text-box-tooltip">${word.text}</div>`;
            textOverlay.appendChild(box);
        });
    }

    function showToast(message) {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #10b981;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            z-index: 10000;
            animation: fadeInOut 2s ease forwards;
        `;

        if (!document.getElementById('toast-style')) {
            const s = document.createElement('style');
            s.id = 'toast-style';
            s.textContent = `
                @keyframes fadeInOut {
                    0% { opacity: 0; transform: translateX(-50%) translateY(20px); }
                    15% { opacity: 1; transform: translateX(-50%) translateY(0); }
                    85% { opacity: 1; transform: translateX(-50%) translateY(0); }
                    100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
                }
            `;
            document.head.appendChild(s);
        }

        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
    }

    if (container) {
        container.appendChild(panel);
    }

    return {
        element: panel,
        setSource(image) {
            sourceImage = image;
            lastResult = null;

            const placeholder = panel.querySelector('.preview-placeholder');
            const previewContainer = panel.querySelector('.preview-container');

            placeholder.style.display = 'none';
            previewContainer.style.display = 'block';

            const width = image.naturalWidth || image.width;
            const height = image.naturalHeight || image.height;

            previewCanvas.width = width;
            previewCanvas.height = height;
            previewCtx.drawImage(image, 0, 0);

            extractBtn.disabled = false;
            resultSection.style.display = 'none';
            progressBar.style.display = 'none';
            textOverlay.innerHTML = '';
        },
        getResult() {
            return lastResult;
        },
        getText() {
            return lastResult?.text || '';
        },
        destroy() {
            if (worker) {
                worker.terminate();
                worker = null;
            }
            panel.remove();
            style.remove();
        }
    };
}
