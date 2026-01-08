/**
 * Custom Presets Module
 * Save and load user-defined presets
 */

const STORAGE_KEY = 'imgopti_custom_presets';

/**
 * Preset structure
 * @typedef {Object} Preset
 * @property {string} id - Unique identifier
 * @property {string} name - Preset name
 * @property {string} icon - Material icon name
 * @property {number} created - Creation timestamp
 * @property {Object} settings - Preset settings
 */

/**
 * Default preset settings structure
 */
export const DEFAULT_SETTINGS = {
    format: 'webp',
    quality: 80,
    resize: {
        enabled: false,
        width: null,
        height: null,
        mode: 'pixels', // 'pixels' or 'percent'
        maintainAspect: true
    },
    filters: {
        brightness: 100,
        contrast: 100,
        saturation: 100,
        grayscale: 0,
        sepia: 0
    },
    watermark: {
        enabled: false,
        text: '',
        position: 'bottom-right',
        opacity: 50
    },
    border: {
        enabled: false,
        width: 0,
        color: '#ffffff',
        style: 'solid'
    }
};

/**
 * Get all custom presets
 * @returns {Array<Preset>}
 */
export function getCustomPresets() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) return [];
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading presets:', error);
        return [];
    }
}

/**
 * Get preset by ID
 * @param {string} id
 * @returns {Preset|null}
 */
export function getPresetById(id) {
    const presets = getCustomPresets();
    return presets.find(p => p.id === id) || null;
}

/**
 * Save new preset
 * @param {string} name - Preset name
 * @param {Object} settings - Preset settings
 * @param {string} icon - Icon name
 * @returns {Preset}
 */
export function savePreset(name, settings, icon = 'tune') {
    const presets = getCustomPresets();

    const preset = {
        id: generateId(),
        name,
        icon,
        created: Date.now(),
        settings: { ...DEFAULT_SETTINGS, ...settings }
    };

    presets.push(preset);
    savePresets(presets);

    return preset;
}

/**
 * Update existing preset
 * @param {string} id - Preset ID
 * @param {Object} updates - Properties to update
 * @returns {Preset|null}
 */
export function updatePreset(id, updates) {
    const presets = getCustomPresets();
    const index = presets.findIndex(p => p.id === id);

    if (index === -1) return null;

    presets[index] = { ...presets[index], ...updates };
    savePresets(presets);

    return presets[index];
}

/**
 * Delete preset
 * @param {string} id - Preset ID
 * @returns {boolean}
 */
export function deletePreset(id) {
    const presets = getCustomPresets();
    const filtered = presets.filter(p => p.id !== id);

    if (filtered.length === presets.length) return false;

    savePresets(filtered);
    return true;
}

/**
 * Save presets to storage
 * @param {Array<Preset>} presets
 */
function savePresets(presets) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
    } catch (error) {
        console.error('Error saving presets:', error);
    }
}

/**
 * Generate unique ID
 * @returns {string}
 */
function generateId() {
    return 'preset_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/**
 * Export presets to JSON file
 * @returns {string} - JSON string
 */
export function exportPresets() {
    const presets = getCustomPresets();
    return JSON.stringify(presets, null, 2);
}

/**
 * Import presets from JSON
 * @param {string} json - JSON string
 * @param {boolean} replace - Replace existing presets
 * @returns {number} - Number of imported presets
 */
export function importPresets(json, replace = false) {
    try {
        const imported = JSON.parse(json);
        if (!Array.isArray(imported)) {
            throw new Error('Invalid preset format');
        }

        let presets = replace ? [] : getCustomPresets();

        // Add imported presets with new IDs
        imported.forEach(preset => {
            presets.push({
                ...preset,
                id: generateId(),
                created: Date.now()
            });
        });

        savePresets(presets);
        return imported.length;
    } catch (error) {
        console.error('Error importing presets:', error);
        return 0;
    }
}

/**
 * Create custom presets UI panel
 * @param {Object} options - Configuration options
 * @returns {Object} - UI controller
 */
export function createPresetsPanel(options = {}) {
    const {
        container,
        onPresetSelect = () => {},
        onPresetApply = () => {},
        getCurrentSettings = () => DEFAULT_SETTINGS
    } = options;

    // Create UI
    const panel = document.createElement('div');
    panel.className = 'presets-panel';
    panel.innerHTML = `
        <div class="presets-header">
            <span class="material-symbols-outlined">bookmark</span>
            <span>Custom Presets</span>
            <div class="presets-actions">
                <button class="preset-action-btn import-btn" title="Import">
                    <span class="material-symbols-outlined">upload</span>
                </button>
                <button class="preset-action-btn export-btn" title="Export">
                    <span class="material-symbols-outlined">download</span>
                </button>
            </div>
        </div>
        <div class="presets-list"></div>
        <div class="presets-empty" style="display: none;">
            <span class="material-symbols-outlined">bookmark_border</span>
            <span>No custom presets</span>
            <span class="empty-hint">Save your current settings as a preset</span>
        </div>
        <div class="save-preset-form">
            <input type="text" class="preset-name-input" placeholder="Preset name..." maxlength="30">
            <button class="save-preset-btn primary">
                <span class="material-symbols-outlined">save</span>
                Save Current Settings
            </button>
        </div>
        <input type="file" class="import-file-input" accept=".json" style="display: none;">
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .presets-panel {
            background: rgba(16, 25, 34, 0.95);
            border-radius: 16px;
            padding: 16px;
            width: 100%;
            max-width: 350px;
        }
        .presets-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 16px;
            color: white;
            font-weight: 600;
        }
        .presets-actions {
            margin-left: auto;
            display: flex;
            gap: 4px;
        }
        .preset-action-btn {
            background: transparent;
            border: none;
            color: #6b7280;
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
        }
        .preset-action-btn:hover {
            background: rgba(255,255,255,0.1);
            color: white;
        }
        .presets-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
            max-height: 300px;
            overflow-y: auto;
            margin-bottom: 16px;
        }
        .preset-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
            background: rgba(255,255,255,0.05);
            border-radius: 10px;
            cursor: pointer;
            transition: background 0.15s;
        }
        .preset-item:hover {
            background: rgba(255,255,255,0.1);
        }
        .preset-item.selected {
            background: rgba(13, 127, 242, 0.2);
            border: 1px solid #0d7ff2;
        }
        .preset-icon {
            width: 40px;
            height: 40px;
            background: rgba(13, 127, 242, 0.2);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #0d7ff2;
        }
        .preset-info {
            flex: 1;
            min-width: 0;
        }
        .preset-name {
            color: white;
            font-size: 14px;
            font-weight: 500;
            margin-bottom: 2px;
        }
        .preset-meta {
            font-size: 11px;
            color: #6b7280;
        }
        .preset-item-actions {
            display: flex;
            gap: 4px;
            opacity: 0;
            transition: opacity 0.15s;
        }
        .preset-item:hover .preset-item-actions {
            opacity: 1;
        }
        .preset-item-btn {
            background: transparent;
            border: none;
            color: #6b7280;
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
        }
        .preset-item-btn:hover {
            background: rgba(255,255,255,0.1);
        }
        .preset-item-btn.delete:hover {
            color: #ef4444;
        }
        .preset-item-btn.apply:hover {
            color: #10b981;
        }
        .presets-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            padding: 30px 20px;
            color: #6b7280;
            text-align: center;
        }
        .presets-empty .material-symbols-outlined {
            font-size: 48px;
            opacity: 0.5;
        }
        .empty-hint {
            font-size: 12px;
            opacity: 0.7;
        }
        .save-preset-form {
            display: flex;
            flex-direction: column;
            gap: 8px;
            padding-top: 16px;
            border-top: 1px solid rgba(255,255,255,0.1);
        }
        .preset-name-input {
            background: #1a2634;
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 8px;
            padding: 10px 12px;
            color: white;
            font-size: 14px;
        }
        .preset-name-input:focus {
            outline: none;
            border-color: #0d7ff2;
        }
        .save-preset-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 10px 16px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 500;
            font-size: 14px;
        }
        .save-preset-btn.primary {
            background: #0d7ff2;
            color: white;
        }
        .save-preset-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    `;
    document.head.appendChild(style);

    const presetsList = panel.querySelector('.presets-list');
    const emptyState = panel.querySelector('.presets-empty');
    const nameInput = panel.querySelector('.preset-name-input');
    const saveBtn = panel.querySelector('.save-preset-btn');
    const importInput = panel.querySelector('.import-file-input');

    let selectedPresetId = null;

    /**
     * Render presets list
     */
    function render() {
        const presets = getCustomPresets();

        if (presets.length === 0) {
            presetsList.innerHTML = '';
            emptyState.style.display = 'flex';
            return;
        }

        emptyState.style.display = 'none';
        presetsList.innerHTML = presets.map(preset => `
            <div class="preset-item ${preset.id === selectedPresetId ? 'selected' : ''}" data-id="${preset.id}">
                <div class="preset-icon">
                    <span class="material-symbols-outlined">${preset.icon}</span>
                </div>
                <div class="preset-info">
                    <div class="preset-name">${preset.name}</div>
                    <div class="preset-meta">
                        ${preset.settings.format.toUpperCase()} • ${preset.settings.quality}% quality
                    </div>
                </div>
                <div class="preset-item-actions">
                    <button class="preset-item-btn apply" data-id="${preset.id}" title="Apply">
                        <span class="material-symbols-outlined">check</span>
                    </button>
                    <button class="preset-item-btn delete" data-id="${preset.id}" title="Delete">
                        <span class="material-symbols-outlined">delete</span>
                    </button>
                </div>
            </div>
        `).join('');

        // Event handlers
        presetsList.querySelectorAll('.preset-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.preset-item-btn')) {
                    selectedPresetId = item.dataset.id;
                    const preset = getPresetById(selectedPresetId);
                    if (preset) {
                        onPresetSelect(preset);
                    }
                    render();
                }
            });
        });

        presetsList.querySelectorAll('.preset-item-btn.apply').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const preset = getPresetById(btn.dataset.id);
                if (preset) {
                    onPresetApply(preset);
                }
            });
        });

        presetsList.querySelectorAll('.preset-item-btn.delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm('Delete this preset?')) {
                    deletePreset(btn.dataset.id);
                    if (selectedPresetId === btn.dataset.id) {
                        selectedPresetId = null;
                    }
                    render();
                }
            });
        });
    }

    // Save preset
    saveBtn.addEventListener('click', () => {
        const name = nameInput.value.trim();
        if (!name) {
            nameInput.focus();
            return;
        }

        const settings = getCurrentSettings();
        savePreset(name, settings);
        nameInput.value = '';
        render();
    });

    nameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            saveBtn.click();
        }
    });

    // Export
    panel.querySelector('.export-btn').addEventListener('click', () => {
        const json = exportPresets();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'imgopti-presets.json';
        a.click();
        URL.revokeObjectURL(url);
    });

    // Import
    panel.querySelector('.import-btn').addEventListener('click', () => {
        importInput.click();
    });

    importInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const count = importPresets(event.target.result);
            if (count > 0) {
                alert(`Imported ${count} preset(s)`);
                render();
            } else {
                alert('Failed to import presets');
            }
        };
        reader.readAsText(file);
        importInput.value = '';
    });

    // Initial render
    render();

    if (container) {
        container.appendChild(panel);
    }

    return {
        element: panel,
        refresh: render,
        save: savePreset,
        delete: deletePreset,
        getAll: getCustomPresets,
        getSelected() {
            return selectedPresetId ? getPresetById(selectedPresetId) : null;
        },
        destroy() {
            panel.remove();
            style.remove();
        }
    };
}
