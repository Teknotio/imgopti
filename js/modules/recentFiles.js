/**
 * Recent Files Module
 * Store and retrieve recent files using LocalStorage
 */

const STORAGE_KEY = 'imgopti_recent_files';
const MAX_RECENT_FILES = 20;
const THUMBNAIL_SIZE = 100;

/**
 * Recent file entry structure
 * @typedef {Object} RecentFile
 * @property {string} id - Unique identifier
 * @property {string} name - File name
 * @property {number} size - File size in bytes
 * @property {string} type - MIME type
 * @property {number} timestamp - Last access timestamp
 * @property {string} thumbnail - Base64 thumbnail data URL
 * @property {Object} dimensions - Width and height
 */

/**
 * Get recent files from storage
 * @returns {Array<RecentFile>}
 */
export function getRecentFiles() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) return [];

        const files = JSON.parse(data);
        return files.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
        console.error('Error reading recent files:', error);
        return [];
    }
}

/**
 * Add file to recent files
 * @param {File} file - File object
 * @param {HTMLCanvasElement|HTMLImageElement} preview - Preview image for thumbnail
 * @returns {Promise<RecentFile>}
 */
export async function addRecentFile(file, preview) {
    const recentFiles = getRecentFiles();

    // Generate unique ID
    const id = generateId();

    // Create thumbnail
    const thumbnail = await createThumbnail(preview);

    // Get dimensions
    const dimensions = {
        width: preview.naturalWidth || preview.width,
        height: preview.naturalHeight || preview.height
    };

    const entry = {
        id,
        name: file.name,
        size: file.size,
        type: file.type,
        timestamp: Date.now(),
        thumbnail,
        dimensions
    };

    // Remove duplicate if exists (by name)
    const existingIndex = recentFiles.findIndex(f => f.name === file.name);
    if (existingIndex !== -1) {
        recentFiles.splice(existingIndex, 1);
    }

    // Add to beginning
    recentFiles.unshift(entry);

    // Trim to max size
    while (recentFiles.length > MAX_RECENT_FILES) {
        recentFiles.pop();
    }

    // Save
    saveRecentFiles(recentFiles);

    return entry;
}

/**
 * Remove file from recent files
 * @param {string} id - File ID
 */
export function removeRecentFile(id) {
    const recentFiles = getRecentFiles();
    const filtered = recentFiles.filter(f => f.id !== id);
    saveRecentFiles(filtered);
}

/**
 * Clear all recent files
 */
export function clearRecentFiles() {
    localStorage.removeItem(STORAGE_KEY);
}

/**
 * Save recent files to storage
 * @param {Array<RecentFile>} files
 */
function saveRecentFiles(files) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
    } catch (error) {
        console.error('Error saving recent files:', error);
        // If storage is full, remove oldest entries
        if (error.name === 'QuotaExceededError') {
            files.pop();
            saveRecentFiles(files);
        }
    }
}

/**
 * Generate unique ID
 * @returns {string}
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Create thumbnail from image
 * @param {HTMLCanvasElement|HTMLImageElement} source
 * @returns {Promise<string>} - Base64 data URL
 */
async function createThumbnail(source) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const width = source.naturalWidth || source.width;
    const height = source.naturalHeight || source.height;
    const aspectRatio = width / height;

    if (aspectRatio > 1) {
        canvas.width = THUMBNAIL_SIZE;
        canvas.height = THUMBNAIL_SIZE / aspectRatio;
    } else {
        canvas.width = THUMBNAIL_SIZE * aspectRatio;
        canvas.height = THUMBNAIL_SIZE;
    }

    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL('image/jpeg', 0.7);
}

/**
 * Format file size for display
 * @param {number} bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Format timestamp for display
 * @param {number} timestamp
 * @returns {string}
 */
export function formatTimestamp(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return new Date(timestamp).toLocaleDateString();
}

/**
 * Create recent files UI panel
 * @param {Object} options - Configuration options
 * @returns {Object} - UI controller
 */
export function createRecentFilesPanel(options = {}) {
    const {
        container,
        onFileSelect = () => {}
    } = options;

    // Create UI
    const panel = document.createElement('div');
    panel.className = 'recent-files-panel';
    panel.innerHTML = `
        <div class="recent-header">
            <span class="material-symbols-outlined">history</span>
            <span>Recent Files</span>
            <button class="clear-recent-btn" title="Clear all">
                <span class="material-symbols-outlined">delete_sweep</span>
            </button>
        </div>
        <div class="recent-list"></div>
        <div class="recent-empty" style="display: none;">
            <span class="material-symbols-outlined">folder_open</span>
            <span>No recent files</span>
        </div>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .recent-files-panel {
            background: rgba(16, 25, 34, 0.95);
            border-radius: 16px;
            padding: 16px;
            width: 100%;
            max-width: 400px;
        }
        .recent-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 16px;
            color: white;
            font-weight: 600;
        }
        .clear-recent-btn {
            margin-left: auto;
            background: transparent;
            border: none;
            color: #6b7280;
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
        }
        .clear-recent-btn:hover {
            background: rgba(255,255,255,0.1);
            color: #ef4444;
        }
        .recent-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
            max-height: 400px;
            overflow-y: auto;
        }
        .recent-item {
            display: flex;
            gap: 12px;
            padding: 10px;
            background: rgba(255,255,255,0.05);
            border-radius: 10px;
            cursor: pointer;
            transition: background 0.15s;
        }
        .recent-item:hover {
            background: rgba(255,255,255,0.1);
        }
        .recent-thumbnail {
            width: 50px;
            height: 50px;
            border-radius: 6px;
            object-fit: cover;
            background: #1a2634;
        }
        .recent-info {
            flex: 1;
            min-width: 0;
        }
        .recent-name {
            color: white;
            font-size: 13px;
            font-weight: 500;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-bottom: 4px;
        }
        .recent-meta {
            display: flex;
            gap: 12px;
            font-size: 11px;
            color: #6b7280;
        }
        .recent-dimensions {
            color: #9ca3af;
        }
        .recent-remove {
            align-self: center;
            background: transparent;
            border: none;
            color: #6b7280;
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            opacity: 0;
            transition: opacity 0.15s;
        }
        .recent-item:hover .recent-remove {
            opacity: 1;
        }
        .recent-remove:hover {
            background: rgba(255,255,255,0.1);
            color: #ef4444;
        }
        .recent-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            padding: 40px 20px;
            color: #6b7280;
            text-align: center;
        }
        .recent-empty .material-symbols-outlined {
            font-size: 48px;
            opacity: 0.5;
        }
    `;
    document.head.appendChild(style);

    const recentList = panel.querySelector('.recent-list');
    const emptyState = panel.querySelector('.recent-empty');

    /**
     * Render recent files list
     */
    function render() {
        const files = getRecentFiles();

        if (files.length === 0) {
            recentList.innerHTML = '';
            emptyState.style.display = 'flex';
            return;
        }

        emptyState.style.display = 'none';
        recentList.innerHTML = files.map(file => `
            <div class="recent-item" data-id="${file.id}">
                <img class="recent-thumbnail" src="${file.thumbnail}" alt="${file.name}">
                <div class="recent-info">
                    <div class="recent-name" title="${file.name}">${file.name}</div>
                    <div class="recent-meta">
                        <span>${formatFileSize(file.size)}</span>
                        <span class="recent-dimensions">${file.dimensions.width}×${file.dimensions.height}</span>
                        <span>${formatTimestamp(file.timestamp)}</span>
                    </div>
                </div>
                <button class="recent-remove" data-id="${file.id}" title="Remove">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
        `).join('');

        // Attach event handlers
        recentList.querySelectorAll('.recent-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.recent-remove')) {
                    const file = files.find(f => f.id === item.dataset.id);
                    if (file) {
                        onFileSelect(file);
                    }
                }
            });
        });

        recentList.querySelectorAll('.recent-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeRecentFile(btn.dataset.id);
                render();
            });
        });
    }

    // Clear all button
    panel.querySelector('.clear-recent-btn').addEventListener('click', () => {
        if (confirm('Clear all recent files?')) {
            clearRecentFiles();
            render();
        }
    });

    // Initial render
    render();

    if (container) {
        container.appendChild(panel);
    }

    return {
        element: panel,
        refresh: render,
        add: addRecentFile,
        remove: removeRecentFile,
        clear: clearRecentFiles,
        getFiles: getRecentFiles,
        destroy() {
            panel.remove();
            style.remove();
        }
    };
}
