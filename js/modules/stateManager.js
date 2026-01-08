/**
 * State Manager for ImgOpti
 * Implements a simple pub/sub pattern for reactive UI updates
 */

// Initial state structure
const initialState = {
    // Screen state
    currentScreen: 'upload', // 'upload', 'editor', 'download'

    // Files state
    files: [], // Array of file objects: { id, file, thumbnail, status, result, error }

    // Settings
    settings: {
        format: 'webp',           // 'jpeg', 'png', 'webp'
        quality: 80,              // 0-100
        resizeEnabled: false,
        width: null,
        height: null,
        unit: 'px',               // 'px' or '%'
        maintainAspectRatio: true,
        keepOriginalDimensions: true
    },

    // Processing state
    processing: {
        isProcessing: false,
        currentIndex: 0,
        totalFiles: 0,
        progress: 0
    },

    // Session stats
    stats: {
        processedCount: 0,
        totalSaved: 0
    },

    // UI state
    ui: {
        isDragging: false,
        errorMessage: null
    }
};

class StateManager {
    constructor() {
        // Deep clone initial state
        this._state = JSON.parse(JSON.stringify(initialState));
        this._listeners = new Map();
        this._globalListeners = new Set();
    }

    /**
     * Get a value from state by path (e.g., 'settings.quality')
     * @param {string} path - Dot-separated path
     * @returns {*} - The value at path
     */
    get(path) {
        if (!path) return this._state;
        return path.split('.').reduce((obj, key) => obj?.[key], this._state);
    }

    /**
     * Set a value in state by path
     * @param {string} path - Dot-separated path
     * @param {*} value - Value to set
     */
    set(path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((obj, key) => {
            if (obj[key] === undefined) obj[key] = {};
            return obj[key];
        }, this._state);

        const oldValue = target[lastKey];
        target[lastKey] = value;

        // Notify listeners
        this._notify(path, value, oldValue);
    }

    /**
     * Update multiple values at once
     * @param {Object} updates - Object with path: value pairs
     */
    update(updates) {
        for (const [path, value] of Object.entries(updates)) {
            this.set(path, value);
        }
    }

    /**
     * Subscribe to changes on a specific path
     * @param {string} path - Path to watch
     * @param {Function} callback - Callback(newValue, oldValue)
     * @returns {Function} - Unsubscribe function
     */
    subscribe(path, callback) {
        if (!this._listeners.has(path)) {
            this._listeners.set(path, new Set());
        }
        this._listeners.get(path).add(callback);

        // Return unsubscribe function
        return () => {
            this._listeners.get(path)?.delete(callback);
        };
    }

    /**
     * Subscribe to all state changes
     * @param {Function} callback - Callback(path, newValue, oldValue)
     * @returns {Function} - Unsubscribe function
     */
    subscribeAll(callback) {
        this._globalListeners.add(callback);
        return () => this._globalListeners.delete(callback);
    }

    /**
     * Notify listeners of a change
     * @private
     */
    _notify(path, newValue, oldValue) {
        // Notify path-specific listeners
        this._listeners.get(path)?.forEach(cb => {
            try {
                cb(newValue, oldValue);
            } catch (e) {
                console.error('State listener error:', e);
            }
        });

        // Notify parent path listeners
        const parts = path.split('.');
        for (let i = parts.length - 1; i > 0; i--) {
            const parentPath = parts.slice(0, i).join('.');
            const parentValue = this.get(parentPath);
            this._listeners.get(parentPath)?.forEach(cb => {
                try {
                    cb(parentValue);
                } catch (e) {
                    console.error('State listener error:', e);
                }
            });
        }

        // Notify global listeners
        this._globalListeners.forEach(cb => {
            try {
                cb(path, newValue, oldValue);
            } catch (e) {
                console.error('Global state listener error:', e);
            }
        });
    }

    /**
     * Reset state to initial values
     */
    reset() {
        this._state = JSON.parse(JSON.stringify(initialState));
        this._notify('', this._state, null);
    }

    /**
     * Reset only files and processing state
     */
    resetFiles() {
        this.set('files', []);
        this.set('processing', {
            isProcessing: false,
            currentIndex: 0,
            totalFiles: 0,
            progress: 0
        });
    }

    /**
     * Reset settings to defaults
     */
    resetSettings() {
        this.set('settings', JSON.parse(JSON.stringify(initialState.settings)));
    }

    // ==================== File Management ====================

    /**
     * Add a file to the queue
     * @param {Object} fileData - { id, file, thumbnail }
     */
    addFile(fileData) {
        const files = [...this.get('files')];
        files.push({
            ...fileData,
            status: 'pending', // pending, processing, done, error
            result: null,
            error: null
        });
        this.set('files', files);
    }

    /**
     * Remove a file from the queue
     * @param {string} id - File ID
     */
    removeFile(id) {
        const files = this.get('files').filter(f => f.id !== id);
        this.set('files', files);
    }

    /**
     * Update a file's status
     * @param {string} id - File ID
     * @param {Object} updates - Properties to update
     */
    updateFile(id, updates) {
        const files = this.get('files').map(f => {
            if (f.id === id) {
                return { ...f, ...updates };
            }
            return f;
        });
        this.set('files', files);
    }

    /**
     * Get a file by ID
     * @param {string} id - File ID
     * @returns {Object|undefined} - File object
     */
    getFile(id) {
        return this.get('files').find(f => f.id === id);
    }

    /**
     * Clear all files
     */
    clearFiles() {
        this.set('files', []);
    }

    // ==================== Screen Navigation ====================

    /**
     * Navigate to a screen
     * @param {string} screen - Screen name
     */
    goToScreen(screen) {
        this.set('currentScreen', screen);
    }

    // ==================== Processing State ====================

    /**
     * Start processing
     */
    startProcessing() {
        const files = this.get('files');
        this.set('processing', {
            isProcessing: true,
            currentIndex: 0,
            totalFiles: files.length,
            progress: 0
        });
    }

    /**
     * Update processing progress
     * @param {number} index - Current file index
     */
    updateProgress(index) {
        const total = this.get('processing.totalFiles');
        this.set('processing.currentIndex', index);
        this.set('processing.progress', Math.round(((index + 1) / total) * 100));
    }

    /**
     * End processing
     */
    endProcessing() {
        this.set('processing.isProcessing', false);
        this.set('processing.progress', 100);
    }

    // ==================== Stats ====================

    /**
     * Increment processed count
     */
    incrementProcessedCount() {
        this.set('stats.processedCount', this.get('stats.processedCount') + 1);
    }

    /**
     * Add to total saved bytes
     * @param {number} bytes - Bytes saved
     */
    addSavedBytes(bytes) {
        this.set('stats.totalSaved', this.get('stats.totalSaved') + bytes);
    }
}

// Export singleton instance
export const state = new StateManager();
export default state;
