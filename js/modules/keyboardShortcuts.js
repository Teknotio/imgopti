/**
 * Keyboard Shortcuts Module
 * Global keyboard shortcut handling
 */

/**
 * Default keyboard shortcuts
 */
export const DEFAULT_SHORTCUTS = {
    // File operations
    'ctrl+o': { action: 'open', label: 'Open files' },
    'ctrl+s': { action: 'save', label: 'Save/Download' },
    'ctrl+shift+s': { action: 'saveAll', label: 'Save all as ZIP' },

    // Edit operations
    'ctrl+z': { action: 'undo', label: 'Undo' },
    'ctrl+shift+z': { action: 'redo', label: 'Redo' },
    'ctrl+y': { action: 'redo', label: 'Redo' },
    'ctrl+c': { action: 'copy', label: 'Copy' },
    'ctrl+v': { action: 'paste', label: 'Paste image' },
    'delete': { action: 'delete', label: 'Delete selected' },
    'backspace': { action: 'delete', label: 'Delete selected' },

    // View operations
    'ctrl+0': { action: 'fitToScreen', label: 'Fit to screen' },
    'ctrl+1': { action: 'actualSize', label: 'Actual size (100%)' },
    'ctrl+=': { action: 'zoomIn', label: 'Zoom in' },
    'ctrl+-': { action: 'zoomOut', label: 'Zoom out' },
    'space': { action: 'togglePreview', label: 'Toggle preview' },
    'f': { action: 'fullscreen', label: 'Fullscreen' },

    // Transform operations
    'r': { action: 'rotateRight', label: 'Rotate 90° right' },
    'shift+r': { action: 'rotateLeft', label: 'Rotate 90° left' },
    'h': { action: 'flipHorizontal', label: 'Flip horizontal' },
    'v': { action: 'flipVertical', label: 'Flip vertical' },

    // Tool operations
    'c': { action: 'crop', label: 'Crop tool' },
    't': { action: 'text', label: 'Text tool' },
    'b': { action: 'brush', label: 'Brush tool' },
    'e': { action: 'eraser', label: 'Eraser tool' },
    'p': { action: 'picker', label: 'Color picker' },

    // Navigation
    'arrowleft': { action: 'prevImage', label: 'Previous image' },
    'arrowright': { action: 'nextImage', label: 'Next image' },
    'escape': { action: 'cancel', label: 'Cancel/Close' },
    'enter': { action: 'confirm', label: 'Confirm/Apply' },

    // Quick settings
    '1': { action: 'quality10', label: 'Quality 10%' },
    '2': { action: 'quality20', label: 'Quality 20%' },
    '3': { action: 'quality30', label: 'Quality 30%' },
    '4': { action: 'quality40', label: 'Quality 40%' },
    '5': { action: 'quality50', label: 'Quality 50%' },
    '6': { action: 'quality60', label: 'Quality 60%' },
    '7': { action: 'quality70', label: 'Quality 70%' },
    '8': { action: 'quality80', label: 'Quality 80%' },
    '9': { action: 'quality90', label: 'Quality 90%' },
    '0': { action: 'quality100', label: 'Quality 100%' },

    // Help
    '?': { action: 'help', label: 'Show shortcuts' },
    'shift+/': { action: 'help', label: 'Show shortcuts' }
};

/**
 * Create keyboard shortcut manager
 * @param {Object} options - Configuration options
 * @returns {Object} - Shortcut manager
 */
export function createKeyboardShortcuts(options = {}) {
    const {
        shortcuts = DEFAULT_SHORTCUTS,
        onAction = () => {},
        enabled = true
    } = options;

    let isEnabled = enabled;
    let currentShortcuts = { ...shortcuts };
    const listeners = new Map();

    /**
     * Convert KeyboardEvent to shortcut string
     * @param {KeyboardEvent} e
     * @returns {string}
     */
    function eventToShortcut(e) {
        const parts = [];
        if (e.ctrlKey || e.metaKey) parts.push('ctrl');
        if (e.altKey) parts.push('alt');
        if (e.shiftKey) parts.push('shift');
        parts.push(e.key.toLowerCase());
        return parts.join('+');
    }

    /**
     * Handle keydown event
     * @param {KeyboardEvent} e
     */
    function handleKeyDown(e) {
        if (!isEnabled) return;

        // Ignore if typing in input/textarea
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
            // Allow certain shortcuts even in inputs
            const shortcut = eventToShortcut(e);
            if (!['ctrl+s', 'ctrl+z', 'ctrl+y', 'ctrl+shift+z', 'escape'].includes(shortcut)) {
                return;
            }
        }

        const shortcut = eventToShortcut(e);
        const mapping = currentShortcuts[shortcut];

        if (mapping) {
            e.preventDefault();
            e.stopPropagation();
            onAction(mapping.action, e);

            // Notify listeners
            const actionListeners = listeners.get(mapping.action);
            if (actionListeners) {
                actionListeners.forEach(callback => callback(e));
            }
        }
    }

    // Attach global listener
    document.addEventListener('keydown', handleKeyDown);

    return {
        /**
         * Enable shortcuts
         */
        enable() {
            isEnabled = true;
        },

        /**
         * Disable shortcuts
         */
        disable() {
            isEnabled = false;
        },

        /**
         * Check if enabled
         */
        isEnabled() {
            return isEnabled;
        },

        /**
         * Add listener for specific action
         * @param {string} action
         * @param {Function} callback
         */
        on(action, callback) {
            if (!listeners.has(action)) {
                listeners.set(action, new Set());
            }
            listeners.get(action).add(callback);
        },

        /**
         * Remove listener
         * @param {string} action
         * @param {Function} callback
         */
        off(action, callback) {
            const actionListeners = listeners.get(action);
            if (actionListeners) {
                actionListeners.delete(callback);
            }
        },

        /**
         * Update shortcut mapping
         * @param {string} shortcut
         * @param {Object} mapping
         */
        setShortcut(shortcut, mapping) {
            currentShortcuts[shortcut.toLowerCase()] = mapping;
        },

        /**
         * Remove shortcut
         * @param {string} shortcut
         */
        removeShortcut(shortcut) {
            delete currentShortcuts[shortcut.toLowerCase()];
        },

        /**
         * Get all shortcuts
         * @returns {Object}
         */
        getShortcuts() {
            return { ...currentShortcuts };
        },

        /**
         * Get shortcut for action
         * @param {string} action
         * @returns {string|null}
         */
        getShortcutForAction(action) {
            for (const [shortcut, mapping] of Object.entries(currentShortcuts)) {
                if (mapping.action === action) {
                    return shortcut;
                }
            }
            return null;
        },

        /**
         * Format shortcut for display
         * @param {string} shortcut
         * @returns {string}
         */
        formatShortcut(shortcut) {
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            return shortcut
                .split('+')
                .map(key => {
                    switch (key) {
                        case 'ctrl': return isMac ? '⌘' : 'Ctrl';
                        case 'alt': return isMac ? '⌥' : 'Alt';
                        case 'shift': return isMac ? '⇧' : 'Shift';
                        case 'enter': return isMac ? '↵' : 'Enter';
                        case 'escape': return 'Esc';
                        case 'arrowleft': return '←';
                        case 'arrowright': return '→';
                        case 'arrowup': return '↑';
                        case 'arrowdown': return '↓';
                        case 'backspace': return isMac ? '⌫' : 'Backspace';
                        case 'delete': return isMac ? '⌦' : 'Del';
                        case 'space': return 'Space';
                        default: return key.toUpperCase();
                    }
                })
                .join(isMac ? '' : ' + ');
        },

        /**
         * Show shortcuts help modal
         */
        showHelp() {
            showShortcutsModal(currentShortcuts, this.formatShortcut.bind(this));
        },

        /**
         * Destroy and cleanup
         */
        destroy() {
            document.removeEventListener('keydown', handleKeyDown);
            listeners.clear();
        }
    };
}

/**
 * Show shortcuts help modal
 * @param {Object} shortcuts
 * @param {Function} formatFn
 */
function showShortcutsModal(shortcuts, formatFn) {
    // Remove existing modal
    const existingModal = document.querySelector('.shortcuts-modal');
    if (existingModal) {
        existingModal.remove();
        return;
    }

    // Group shortcuts by category
    const categories = {
        'File': ['open', 'save', 'saveAll'],
        'Edit': ['undo', 'redo', 'copy', 'paste', 'delete'],
        'View': ['fitToScreen', 'actualSize', 'zoomIn', 'zoomOut', 'togglePreview', 'fullscreen'],
        'Transform': ['rotateRight', 'rotateLeft', 'flipHorizontal', 'flipVertical'],
        'Tools': ['crop', 'text', 'brush', 'eraser', 'picker'],
        'Navigation': ['prevImage', 'nextImage', 'cancel', 'confirm'],
        'Quality': ['quality10', 'quality20', 'quality30', 'quality40', 'quality50',
                   'quality60', 'quality70', 'quality80', 'quality90', 'quality100']
    };

    // Build shortcut lookup
    const shortcutLookup = {};
    for (const [shortcut, mapping] of Object.entries(shortcuts)) {
        if (!shortcutLookup[mapping.action]) {
            shortcutLookup[mapping.action] = [];
        }
        shortcutLookup[mapping.action].push({ shortcut, label: mapping.label });
    }

    // Build modal HTML
    let categoryHTML = '';
    for (const [category, actions] of Object.entries(categories)) {
        const items = actions
            .filter(action => shortcutLookup[action])
            .map(action => {
                const mappings = shortcutLookup[action];
                const primary = mappings[0];
                return `
                    <div class="shortcut-item">
                        <span class="shortcut-label">${primary.label}</span>
                        <span class="shortcut-key">${formatFn(primary.shortcut)}</span>
                    </div>
                `;
            })
            .join('');

        if (items) {
            categoryHTML += `
                <div class="shortcut-category">
                    <div class="shortcut-category-title">${category}</div>
                    ${items}
                </div>
            `;
        }
    }

    const modal = document.createElement('div');
    modal.className = 'shortcuts-modal';
    modal.innerHTML = `
        <div class="shortcuts-modal-content">
            <div class="shortcuts-modal-header">
                <span class="material-symbols-outlined">keyboard</span>
                <span>Keyboard Shortcuts</span>
                <button class="shortcuts-modal-close">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
            <div class="shortcuts-modal-body">
                ${categoryHTML}
            </div>
            <div class="shortcuts-modal-footer">
                Press <span class="shortcut-key">?</span> to toggle this dialog
            </div>
        </div>
    `;

    // Add styles
    const style = document.createElement('style');
    style.id = 'shortcuts-modal-style';
    if (!document.getElementById('shortcuts-modal-style')) {
        style.textContent = `
            .shortcuts-modal {
                position: fixed;
                inset: 0;
                background: rgba(0,0,0,0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                animation: fadeIn 0.2s ease;
            }
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            .shortcuts-modal-content {
                background: #1a2634;
                border-radius: 16px;
                width: 90%;
                max-width: 600px;
                max-height: 80vh;
                overflow: hidden;
                box-shadow: 0 20px 60px rgba(0,0,0,0.5);
            }
            .shortcuts-modal-header {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 20px;
                background: rgba(13, 127, 242, 0.1);
                border-bottom: 1px solid rgba(255,255,255,0.1);
                color: white;
                font-size: 18px;
                font-weight: 600;
            }
            .shortcuts-modal-close {
                margin-left: auto;
                background: transparent;
                border: none;
                color: #9ca3af;
                cursor: pointer;
                padding: 8px;
                border-radius: 8px;
            }
            .shortcuts-modal-close:hover {
                background: rgba(255,255,255,0.1);
                color: white;
            }
            .shortcuts-modal-body {
                padding: 20px;
                overflow-y: auto;
                max-height: calc(80vh - 140px);
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 24px;
            }
            .shortcut-category-title {
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 1px;
                color: #6b7280;
                margin-bottom: 12px;
                font-weight: 600;
            }
            .shortcut-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 0;
                border-bottom: 1px solid rgba(255,255,255,0.05);
            }
            .shortcut-item:last-child {
                border-bottom: none;
            }
            .shortcut-label {
                color: #d1d5db;
                font-size: 13px;
            }
            .shortcut-key {
                background: rgba(255,255,255,0.1);
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                font-family: monospace;
                white-space: nowrap;
            }
            .shortcuts-modal-footer {
                padding: 16px 20px;
                border-top: 1px solid rgba(255,255,255,0.1);
                text-align: center;
                color: #6b7280;
                font-size: 13px;
            }
            .shortcuts-modal-footer .shortcut-key {
                display: inline-block;
                margin: 0 4px;
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(modal);

    // Close handlers
    const closeModal = () => modal.remove();
    modal.querySelector('.shortcuts-modal-close').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    document.addEventListener('keydown', function closeOnEscape(e) {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', closeOnEscape);
        }
    });
}
