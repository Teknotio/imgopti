/**
 * Image Info Panel Module
 * Displays EXIF data, dimensions, and file information
 */

import * as exifr from 'https://cdn.jsdelivr.net/npm/exifr@7.1.3/dist/full.esm.mjs';

/**
 * Extract image metadata
 * @param {File} file - Image file
 * @returns {Promise<Object>} - Metadata object
 */
export async function extractMetadata(file) {
    const metadata = {
        file: {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: new Date(file.lastModified)
        },
        dimensions: null,
        exif: null,
        gps: null,
        camera: null
    };

    // Get image dimensions
    const img = await loadImage(file);
    metadata.dimensions = {
        width: img.naturalWidth,
        height: img.naturalHeight,
        aspectRatio: (img.naturalWidth / img.naturalHeight).toFixed(2),
        megapixels: ((img.naturalWidth * img.naturalHeight) / 1000000).toFixed(2)
    };

    // Try to extract EXIF data
    try {
        const exifData = await exifr.parse(file, {
            // Include all useful tags
            pick: [
                'Make', 'Model', 'Software',
                'DateTimeOriginal', 'CreateDate', 'ModifyDate',
                'ExposureTime', 'FNumber', 'ISO', 'FocalLength',
                'Flash', 'WhiteBalance', 'ExposureMode',
                'ColorSpace', 'Orientation',
                'GPSLatitude', 'GPSLongitude', 'GPSAltitude',
                'LensModel', 'LensMake',
                'ImageWidth', 'ImageHeight'
            ]
        });

        if (exifData) {
            // Camera info
            if (exifData.Make || exifData.Model) {
                metadata.camera = {
                    make: exifData.Make,
                    model: exifData.Model,
                    lens: exifData.LensModel,
                    software: exifData.Software
                };
            }

            // Shooting settings
            metadata.exif = {
                dateTime: exifData.DateTimeOriginal || exifData.CreateDate,
                exposureTime: exifData.ExposureTime,
                fNumber: exifData.FNumber,
                iso: exifData.ISO,
                focalLength: exifData.FocalLength,
                flash: exifData.Flash,
                whiteBalance: exifData.WhiteBalance,
                exposureMode: exifData.ExposureMode,
                colorSpace: exifData.ColorSpace,
                orientation: exifData.Orientation
            };

            // GPS data
            if (exifData.GPSLatitude && exifData.GPSLongitude) {
                metadata.gps = {
                    latitude: exifData.GPSLatitude,
                    longitude: exifData.GPSLongitude,
                    altitude: exifData.GPSAltitude
                };
            }
        }
    } catch (error) {
        console.warn('Could not extract EXIF data:', error);
    }

    return metadata;
}

/**
 * Load image and return HTMLImageElement
 * @param {File|Blob} file
 * @returns {Promise<HTMLImageElement>}
 */
function loadImage(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(img.src);
            resolve(img);
        };
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
    });
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
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format exposure time
 * @param {number} time - Exposure time in seconds
 * @returns {string}
 */
function formatExposureTime(time) {
    if (!time) return null;
    if (time >= 1) return `${time}s`;
    return `1/${Math.round(1/time)}s`;
}

/**
 * Format focal length
 * @param {number} length
 * @returns {string}
 */
function formatFocalLength(length) {
    if (!length) return null;
    return `${Math.round(length)}mm`;
}

/**
 * Create image info panel UI
 * @param {Object} options - Configuration options
 * @returns {Object} - Panel controller
 */
export function createImageInfoPanel(options = {}) {
    const { container } = options;

    // Create panel HTML
    const panel = document.createElement('div');
    panel.className = 'image-info-panel';
    panel.innerHTML = `
        <div class="info-header">
            <span class="material-symbols-outlined">info</span>
            <span>Image Information</span>
            <button class="close-info-panel">
                <span class="material-symbols-outlined">close</span>
            </button>
        </div>
        <div class="info-content">
            <div class="info-loading">
                <span class="material-symbols-outlined spinning">progress_activity</span>
                Loading metadata...
            </div>
        </div>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .image-info-panel {
            position: fixed;
            right: 20px;
            top: 80px;
            width: 320px;
            max-height: calc(100vh - 120px);
            background: rgba(16, 25, 34, 0.98);
            border-radius: 16px;
            box-shadow: 0 20px 50px rgba(0,0,0,0.5);
            z-index: 1000;
            overflow: hidden;
            display: none;
        }
        .image-info-panel.visible {
            display: block;
            animation: slideIn 0.3s ease;
        }
        @keyframes slideIn {
            from { opacity: 0; transform: translateX(20px); }
            to { opacity: 1; transform: translateX(0); }
        }
        .info-header {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 16px;
            background: rgba(13, 127, 242, 0.1);
            border-bottom: 1px solid rgba(255,255,255,0.1);
            color: white;
            font-weight: 600;
        }
        .close-info-panel {
            margin-left: auto;
            background: transparent;
            border: none;
            color: #9ca3af;
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
        }
        .close-info-panel:hover {
            background: rgba(255,255,255,0.1);
            color: white;
        }
        .info-content {
            padding: 16px;
            overflow-y: auto;
            max-height: calc(100vh - 200px);
        }
        .info-loading {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #9ca3af;
            justify-content: center;
            padding: 32px;
        }
        .spinning {
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        .info-section {
            margin-bottom: 20px;
        }
        .info-section:last-child {
            margin-bottom: 0;
        }
        .info-section-title {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #6b7280;
            margin-bottom: 12px;
            font-weight: 600;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
        }
        .info-item {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }
        .info-item.full-width {
            grid-column: span 2;
        }
        .info-label {
            font-size: 11px;
            color: #6b7280;
        }
        .info-value {
            font-size: 13px;
            color: white;
            word-break: break-all;
        }
        .info-value.highlight {
            color: #0d7ff2;
        }
        .gps-link {
            color: #0d7ff2;
            text-decoration: none;
            display: flex;
            align-items: center;
            gap: 4px;
        }
        .gps-link:hover {
            text-decoration: underline;
        }
        .no-data {
            color: #6b7280;
            font-style: italic;
            text-align: center;
            padding: 16px;
        }
    `;
    document.head.appendChild(style);

    // Setup close button
    const closeBtn = panel.querySelector('.close-info-panel');
    closeBtn.addEventListener('click', () => {
        panel.classList.remove('visible');
    });

    // Append to container or body
    (container || document.body).appendChild(panel);

    /**
     * Render metadata to panel
     * @param {Object} metadata
     */
    function renderMetadata(metadata) {
        const content = panel.querySelector('.info-content');

        let html = '';

        // File section
        html += `
            <div class="info-section">
                <div class="info-section-title">File</div>
                <div class="info-grid">
                    <div class="info-item full-width">
                        <span class="info-label">Name</span>
                        <span class="info-value">${metadata.file.name}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Size</span>
                        <span class="info-value">${formatFileSize(metadata.file.size)}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Type</span>
                        <span class="info-value">${metadata.file.type || 'Unknown'}</span>
                    </div>
                </div>
            </div>
        `;

        // Dimensions section
        if (metadata.dimensions) {
            html += `
                <div class="info-section">
                    <div class="info-section-title">Dimensions</div>
                    <div class="info-grid">
                        <div class="info-item">
                            <span class="info-label">Width</span>
                            <span class="info-value highlight">${metadata.dimensions.width}px</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Height</span>
                            <span class="info-value highlight">${metadata.dimensions.height}px</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Aspect Ratio</span>
                            <span class="info-value">${metadata.dimensions.aspectRatio}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Megapixels</span>
                            <span class="info-value">${metadata.dimensions.megapixels} MP</span>
                        </div>
                    </div>
                </div>
            `;
        }

        // Camera section
        if (metadata.camera) {
            html += `
                <div class="info-section">
                    <div class="info-section-title">Camera</div>
                    <div class="info-grid">
                        ${metadata.camera.make ? `
                            <div class="info-item">
                                <span class="info-label">Make</span>
                                <span class="info-value">${metadata.camera.make}</span>
                            </div>
                        ` : ''}
                        ${metadata.camera.model ? `
                            <div class="info-item">
                                <span class="info-label">Model</span>
                                <span class="info-value">${metadata.camera.model}</span>
                            </div>
                        ` : ''}
                        ${metadata.camera.lens ? `
                            <div class="info-item full-width">
                                <span class="info-label">Lens</span>
                                <span class="info-value">${metadata.camera.lens}</span>
                            </div>
                        ` : ''}
                        ${metadata.camera.software ? `
                            <div class="info-item full-width">
                                <span class="info-label">Software</span>
                                <span class="info-value">${metadata.camera.software}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }

        // EXIF section
        if (metadata.exif) {
            const exif = metadata.exif;
            html += `
                <div class="info-section">
                    <div class="info-section-title">Shooting Settings</div>
                    <div class="info-grid">
                        ${exif.dateTime ? `
                            <div class="info-item full-width">
                                <span class="info-label">Date Taken</span>
                                <span class="info-value">${new Date(exif.dateTime).toLocaleString()}</span>
                            </div>
                        ` : ''}
                        ${exif.exposureTime ? `
                            <div class="info-item">
                                <span class="info-label">Shutter Speed</span>
                                <span class="info-value">${formatExposureTime(exif.exposureTime)}</span>
                            </div>
                        ` : ''}
                        ${exif.fNumber ? `
                            <div class="info-item">
                                <span class="info-label">Aperture</span>
                                <span class="info-value">f/${exif.fNumber}</span>
                            </div>
                        ` : ''}
                        ${exif.iso ? `
                            <div class="info-item">
                                <span class="info-label">ISO</span>
                                <span class="info-value">${exif.iso}</span>
                            </div>
                        ` : ''}
                        ${exif.focalLength ? `
                            <div class="info-item">
                                <span class="info-label">Focal Length</span>
                                <span class="info-value">${formatFocalLength(exif.focalLength)}</span>
                            </div>
                        ` : ''}
                        ${exif.flash !== undefined ? `
                            <div class="info-item">
                                <span class="info-label">Flash</span>
                                <span class="info-value">${exif.flash ? 'Fired' : 'Off'}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }

        // GPS section
        if (metadata.gps) {
            const lat = metadata.gps.latitude;
            const lon = metadata.gps.longitude;
            const mapsUrl = `https://www.google.com/maps?q=${lat},${lon}`;
            html += `
                <div class="info-section">
                    <div class="info-section-title">Location</div>
                    <div class="info-grid">
                        <div class="info-item">
                            <span class="info-label">Latitude</span>
                            <span class="info-value">${lat.toFixed(6)}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Longitude</span>
                            <span class="info-value">${lon.toFixed(6)}</span>
                        </div>
                        ${metadata.gps.altitude ? `
                            <div class="info-item">
                                <span class="info-label">Altitude</span>
                                <span class="info-value">${Math.round(metadata.gps.altitude)}m</span>
                            </div>
                        ` : ''}
                        <div class="info-item full-width">
                            <a href="${mapsUrl}" target="_blank" rel="noopener" class="gps-link">
                                <span class="material-symbols-outlined">map</span>
                                View on Google Maps
                            </a>
                        </div>
                    </div>
                </div>
            `;
        }

        // No EXIF data message
        if (!metadata.camera && !metadata.exif && !metadata.gps) {
            html += `
                <div class="no-data">
                    No EXIF data available for this image
                </div>
            `;
        }

        content.innerHTML = html;
    }

    return {
        element: panel,
        async show(file) {
            panel.classList.add('visible');
            panel.querySelector('.info-content').innerHTML = `
                <div class="info-loading">
                    <span class="material-symbols-outlined spinning">progress_activity</span>
                    Loading metadata...
                </div>
            `;

            try {
                const metadata = await extractMetadata(file);
                renderMetadata(metadata);
            } catch (error) {
                panel.querySelector('.info-content').innerHTML = `
                    <div class="no-data">
                        Could not load image metadata
                    </div>
                `;
            }
        },
        hide() {
            panel.classList.remove('visible');
        },
        toggle(file) {
            if (panel.classList.contains('visible')) {
                this.hide();
            } else if (file) {
                this.show(file);
            }
        },
        destroy() {
            panel.remove();
            style.remove();
        }
    };
}
