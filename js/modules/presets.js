/**
 * Presets Module
 * Pre-configured optimization profiles for common use cases
 */

export const PRESETS = {
    web: {
        id: 'web',
        name: 'Web',
        icon: 'public',
        description: 'Optimized for fast website loading',
        settings: {
            format: 'webp',
            quality: 80,
            maxWidth: 1920,
            maxHeight: 1080,
            resizeEnabled: true,
            maintainAspectRatio: true
        }
    },
    email: {
        id: 'email',
        name: 'Email',
        icon: 'mail',
        description: 'Small file size for email attachments',
        settings: {
            format: 'jpeg',
            quality: 70,
            maxWidth: 1200,
            maxHeight: 900,
            resizeEnabled: true,
            maintainAspectRatio: true
        }
    },
    social: {
        id: 'social',
        name: 'Social Media',
        icon: 'share',
        description: 'Ideal for Instagram, Facebook, Twitter',
        settings: {
            format: 'jpeg',
            quality: 85,
            maxWidth: 1080,
            maxHeight: 1080,
            resizeEnabled: true,
            maintainAspectRatio: true
        }
    },
    instagram: {
        id: 'instagram',
        name: 'Instagram Post',
        icon: 'photo_camera',
        description: 'Square format for Instagram feed',
        settings: {
            format: 'jpeg',
            quality: 90,
            maxWidth: 1080,
            maxHeight: 1080,
            resizeEnabled: true,
            maintainAspectRatio: false,
            cropRatio: 1 // Square
        }
    },
    instagramStory: {
        id: 'instagramStory',
        name: 'Instagram Story',
        icon: 'smartphone',
        description: 'Vertical format for stories',
        settings: {
            format: 'jpeg',
            quality: 90,
            maxWidth: 1080,
            maxHeight: 1920,
            resizeEnabled: true,
            maintainAspectRatio: true
        }
    },
    twitter: {
        id: 'twitter',
        name: 'Twitter/X',
        icon: 'tag',
        description: 'Optimized for Twitter timeline',
        settings: {
            format: 'jpeg',
            quality: 85,
            maxWidth: 1200,
            maxHeight: 675,
            resizeEnabled: true,
            maintainAspectRatio: true
        }
    },
    thumbnail: {
        id: 'thumbnail',
        name: 'Thumbnail',
        icon: 'view_comfy',
        description: 'Small preview images',
        settings: {
            format: 'jpeg',
            quality: 75,
            maxWidth: 300,
            maxHeight: 300,
            resizeEnabled: true,
            maintainAspectRatio: true
        }
    },
    print: {
        id: 'print',
        name: 'Print Quality',
        icon: 'print',
        description: 'High quality for printing',
        settings: {
            format: 'png',
            quality: 100,
            maxWidth: 4096,
            maxHeight: 4096,
            resizeEnabled: false,
            maintainAspectRatio: true
        }
    },
    avatar: {
        id: 'avatar',
        name: 'Profile Picture',
        icon: 'account_circle',
        description: 'Square avatar for profiles',
        settings: {
            format: 'jpeg',
            quality: 85,
            maxWidth: 400,
            maxHeight: 400,
            resizeEnabled: true,
            maintainAspectRatio: false,
            cropRatio: 1
        }
    },
    maximum: {
        id: 'maximum',
        name: 'Maximum Compression',
        icon: 'compress',
        description: 'Smallest possible file size',
        settings: {
            format: 'webp',
            quality: 50,
            maxWidth: 1280,
            maxHeight: 720,
            resizeEnabled: true,
            maintainAspectRatio: true
        }
    },
    lossless: {
        id: 'lossless',
        name: 'Lossless',
        icon: 'high_quality',
        description: 'No quality loss (larger files)',
        settings: {
            format: 'png',
            quality: 100,
            resizeEnabled: false,
            maintainAspectRatio: true
        }
    }
};

/**
 * Get all presets as array
 * @returns {Array}
 */
export function getAllPresets() {
    return Object.values(PRESETS);
}

/**
 * Get preset by ID
 * @param {string} id - Preset ID
 * @returns {Object|null}
 */
export function getPreset(id) {
    return PRESETS[id] || null;
}

/**
 * Get quick presets (most commonly used)
 * @returns {Array}
 */
export function getQuickPresets() {
    return ['web', 'email', 'social', 'thumbnail'].map(id => PRESETS[id]);
}

/**
 * Apply preset settings to current state
 * @param {Object} stateManager - State manager instance
 * @param {string} presetId - Preset ID to apply
 */
export function applyPreset(stateManager, presetId) {
    const preset = PRESETS[presetId];
    if (!preset) return;

    const { settings } = preset;

    stateManager.set('settings.format', settings.format);
    stateManager.set('settings.quality', settings.quality);

    if (settings.resizeEnabled && settings.maxWidth) {
        stateManager.set('settings.resizeEnabled', true);
        stateManager.set('settings.keepOriginalDimensions', false);
        stateManager.set('settings.width', settings.maxWidth);
        stateManager.set('settings.height', settings.maxHeight);
        stateManager.set('settings.maintainAspectRatio', settings.maintainAspectRatio);
    } else {
        stateManager.set('settings.resizeEnabled', false);
        stateManager.set('settings.keepOriginalDimensions', true);
    }
}

/**
 * Bulk rename patterns
 */
export const RENAME_PATTERNS = {
    numbered: {
        id: 'numbered',
        name: 'Numbered',
        example: 'image_001, image_002...',
        pattern: (baseName, index, total) => {
            const padding = String(total).length;
            const num = String(index + 1).padStart(padding, '0');
            return `${baseName}_${num}`;
        }
    },
    dated: {
        id: 'dated',
        name: 'Date + Number',
        example: '2024-01-15_001...',
        pattern: (baseName, index, total) => {
            const date = new Date().toISOString().slice(0, 10);
            const padding = String(total).length;
            const num = String(index + 1).padStart(padding, '0');
            return `${date}_${num}`;
        }
    },
    prefixed: {
        id: 'prefixed',
        name: 'Prefix + Original',
        example: 'optimized_photo1...',
        pattern: (baseName, index, total, originalName) => {
            return `optimized_${originalName}`;
        }
    },
    suffixed: {
        id: 'suffixed',
        name: 'Original + Suffix',
        example: 'photo1_web...',
        pattern: (baseName, index, total, originalName, presetId) => {
            return `${originalName}_${presetId || 'opt'}`;
        }
    }
};

/**
 * Apply rename pattern to files
 * @param {Array} files - Array of file objects
 * @param {string} patternId - Rename pattern ID
 * @param {string} baseName - Base name for files
 * @param {string} presetId - Applied preset ID (optional)
 * @returns {Array} - Files with newName property
 */
export function applyRenamePattern(files, patternId, baseName = 'image', presetId = '') {
    const pattern = RENAME_PATTERNS[patternId]?.pattern || RENAME_PATTERNS.numbered.pattern;

    return files.map((file, index) => {
        const originalBaseName = file.originalName?.replace(/\.[^.]+$/, '') || 'image';
        const newBaseName = pattern(baseName, index, files.length, originalBaseName, presetId);
        return {
            ...file,
            renamedBaseName: newBaseName
        };
    });
}
