/**
 * Crop Tool Module
 * Interactive crop selection with aspect ratio presets
 */

// Aspect ratio presets
export const ASPECT_RATIOS = {
    free: { label: 'Free', value: null },
    square: { label: '1:1', value: 1 },
    '4:3': { label: '4:3', value: 4/3 },
    '3:4': { label: '3:4', value: 3/4 },
    '16:9': { label: '16:9', value: 16/9 },
    '9:16': { label: '9:16', value: 9/16 },
    '3:2': { label: '3:2', value: 3/2 },
    '2:3': { label: '2:3', value: 2/3 }
};

/**
 * Create crop overlay UI
 * @param {HTMLElement} container - Container element
 * @param {Object} options - Configuration options
 * @returns {Object} - Crop tool controller
 */
export function createCropTool(container, options = {}) {
    const {
        aspectRatio = null,
        minWidth = 20,
        minHeight = 20,
        onCropChange = () => {},
        onCropEnd = () => {}
    } = options;

    let currentAspectRatio = aspectRatio;
    let cropArea = { x: 10, y: 10, width: 80, height: 80 }; // Percentages
    let isDragging = false;
    let isResizing = false;
    let dragStart = { x: 0, y: 0 };
    let resizeHandle = null;

    // Create overlay elements
    const overlay = document.createElement('div');
    overlay.className = 'crop-overlay';
    overlay.innerHTML = `
        <div class="crop-darkarea crop-top"></div>
        <div class="crop-darkarea crop-left"></div>
        <div class="crop-darkarea crop-right"></div>
        <div class="crop-darkarea crop-bottom"></div>
        <div class="crop-selection">
            <div class="crop-handle crop-handle-nw" data-handle="nw"></div>
            <div class="crop-handle crop-handle-n" data-handle="n"></div>
            <div class="crop-handle crop-handle-ne" data-handle="ne"></div>
            <div class="crop-handle crop-handle-w" data-handle="w"></div>
            <div class="crop-handle crop-handle-e" data-handle="e"></div>
            <div class="crop-handle crop-handle-sw" data-handle="sw"></div>
            <div class="crop-handle crop-handle-s" data-handle="s"></div>
            <div class="crop-handle crop-handle-se" data-handle="se"></div>
            <div class="crop-grid">
                <div class="crop-grid-line crop-grid-h1"></div>
                <div class="crop-grid-line crop-grid-h2"></div>
                <div class="crop-grid-line crop-grid-v1"></div>
                <div class="crop-grid-line crop-grid-v2"></div>
            </div>
            <div class="crop-info"></div>
        </div>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .crop-overlay {
            position: absolute;
            inset: 0;
            z-index: 100;
            cursor: crosshair;
        }
        .crop-darkarea {
            position: absolute;
            background: rgba(0, 0, 0, 0.6);
            pointer-events: none;
        }
        .crop-top { top: 0; left: 0; right: 0; }
        .crop-bottom { bottom: 0; left: 0; right: 0; }
        .crop-left { left: 0; }
        .crop-right { right: 0; }
        .crop-selection {
            position: absolute;
            border: 2px solid #fff;
            box-shadow: 0 0 0 1px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(0,0,0,0.5);
            cursor: move;
        }
        .crop-handle {
            position: absolute;
            width: 20px;
            height: 20px;
            background: #fff;
            border: 2px solid #0d7ff2;
            border-radius: 50%;
            transform: translate(-50%, -50%);
            z-index: 10;
        }
        .crop-handle-nw { top: 0; left: 0; cursor: nw-resize; }
        .crop-handle-n { top: 0; left: 50%; cursor: n-resize; }
        .crop-handle-ne { top: 0; left: 100%; cursor: ne-resize; }
        .crop-handle-w { top: 50%; left: 0; cursor: w-resize; }
        .crop-handle-e { top: 50%; left: 100%; cursor: e-resize; }
        .crop-handle-sw { top: 100%; left: 0; cursor: sw-resize; }
        .crop-handle-s { top: 100%; left: 50%; cursor: s-resize; }
        .crop-handle-se { top: 100%; left: 100%; cursor: se-resize; }
        .crop-grid {
            position: absolute;
            inset: 0;
            pointer-events: none;
        }
        .crop-grid-line {
            position: absolute;
            background: rgba(255,255,255,0.4);
        }
        .crop-grid-h1, .crop-grid-h2 { left: 0; right: 0; height: 1px; }
        .crop-grid-h1 { top: 33.33%; }
        .crop-grid-h2 { top: 66.66%; }
        .crop-grid-v1, .crop-grid-v2 { top: 0; bottom: 0; width: 1px; }
        .crop-grid-v1 { left: 33.33%; }
        .crop-grid-v2 { left: 66.66%; }
        .crop-info {
            position: absolute;
            bottom: -30px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.7);
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            white-space: nowrap;
        }
    `;
    document.head.appendChild(style);

    const selection = overlay.querySelector('.crop-selection');
    const cropInfo = overlay.querySelector('.crop-info');
    const handles = overlay.querySelectorAll('.crop-handle');

    // Update crop display
    function updateDisplay() {
        const containerRect = container.getBoundingClientRect();
        const { x, y, width, height } = cropArea;

        // Update selection position
        selection.style.left = `${x}%`;
        selection.style.top = `${y}%`;
        selection.style.width = `${width}%`;
        selection.style.height = `${height}%`;

        // Update dark areas
        const top = overlay.querySelector('.crop-top');
        const bottom = overlay.querySelector('.crop-bottom');
        const left = overlay.querySelector('.crop-left');
        const right = overlay.querySelector('.crop-right');

        top.style.height = `${y}%`;
        bottom.style.top = `${y + height}%`;
        left.style.top = `${y}%`;
        left.style.width = `${x}%`;
        left.style.height = `${height}%`;
        right.style.top = `${y}%`;
        right.style.left = `${x + width}%`;
        right.style.height = `${height}%`;

        // Update info
        const pixelWidth = Math.round((width / 100) * containerRect.width);
        const pixelHeight = Math.round((height / 100) * containerRect.height);
        cropInfo.textContent = `${pixelWidth} × ${pixelHeight}`;

        onCropChange(getCropData());
    }

    // Get crop data in pixels
    function getCropData() {
        const containerRect = container.getBoundingClientRect();
        return {
            x: Math.round((cropArea.x / 100) * containerRect.width),
            y: Math.round((cropArea.y / 100) * containerRect.height),
            width: Math.round((cropArea.width / 100) * containerRect.width),
            height: Math.round((cropArea.height / 100) * containerRect.height),
            percentages: { ...cropArea }
        };
    }

    // Mouse/touch handlers
    function handleStart(e) {
        e.preventDefault();
        const rect = container.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        dragStart = {
            x: ((clientX - rect.left) / rect.width) * 100,
            y: ((clientY - rect.top) / rect.height) * 100,
            cropArea: { ...cropArea }
        };

        // Check if clicking on a handle
        const handle = e.target.closest('.crop-handle');
        if (handle) {
            isResizing = true;
            resizeHandle = handle.dataset.handle;
        } else if (e.target.closest('.crop-selection')) {
            isDragging = true;
        }
    }

    function handleMove(e) {
        if (!isDragging && !isResizing) return;
        e.preventDefault();

        const rect = container.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const currentX = ((clientX - rect.left) / rect.width) * 100;
        const currentY = ((clientY - rect.top) / rect.height) * 100;
        const deltaX = currentX - dragStart.x;
        const deltaY = currentY - dragStart.y;

        if (isDragging) {
            // Move selection
            let newX = dragStart.cropArea.x + deltaX;
            let newY = dragStart.cropArea.y + deltaY;

            // Constrain to bounds
            newX = Math.max(0, Math.min(100 - cropArea.width, newX));
            newY = Math.max(0, Math.min(100 - cropArea.height, newY));

            cropArea.x = newX;
            cropArea.y = newY;
        } else if (isResizing) {
            // Resize selection
            let { x, y, width, height } = dragStart.cropArea;

            switch (resizeHandle) {
                case 'nw':
                    x += deltaX;
                    y += deltaY;
                    width -= deltaX;
                    height -= deltaY;
                    break;
                case 'n':
                    y += deltaY;
                    height -= deltaY;
                    break;
                case 'ne':
                    y += deltaY;
                    width += deltaX;
                    height -= deltaY;
                    break;
                case 'w':
                    x += deltaX;
                    width -= deltaX;
                    break;
                case 'e':
                    width += deltaX;
                    break;
                case 'sw':
                    x += deltaX;
                    width -= deltaX;
                    height += deltaY;
                    break;
                case 's':
                    height += deltaY;
                    break;
                case 'se':
                    width += deltaX;
                    height += deltaY;
                    break;
            }

            // Apply aspect ratio constraint
            if (currentAspectRatio) {
                const containerAspect = rect.width / rect.height;
                const targetHeight = (width / currentAspectRatio) * containerAspect;
                if (['n', 's', 'nw', 'ne', 'sw', 'se'].includes(resizeHandle)) {
                    height = targetHeight;
                }
            }

            // Minimum size
            const minW = (minWidth / rect.width) * 100;
            const minH = (minHeight / rect.height) * 100;
            if (width < minW) width = minW;
            if (height < minH) height = minH;

            // Constrain to bounds
            if (x < 0) { width += x; x = 0; }
            if (y < 0) { height += y; y = 0; }
            if (x + width > 100) width = 100 - x;
            if (y + height > 100) height = 100 - y;

            cropArea = { x, y, width, height };
        }

        updateDisplay();
    }

    function handleEnd() {
        if (isDragging || isResizing) {
            onCropEnd(getCropData());
        }
        isDragging = false;
        isResizing = false;
        resizeHandle = null;
    }

    // Attach events
    overlay.addEventListener('mousedown', handleStart);
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    overlay.addEventListener('touchstart', handleStart, { passive: false });
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleEnd);

    // Add to container
    container.style.position = 'relative';
    container.appendChild(overlay);
    updateDisplay();

    // Return controller
    return {
        getCropData,
        setAspectRatio(ratio) {
            currentAspectRatio = ratio;
            if (ratio) {
                // Adjust current selection to match ratio
                const containerRect = container.getBoundingClientRect();
                const containerAspect = containerRect.width / containerRect.height;
                const targetHeight = (cropArea.width / ratio) * containerAspect;
                cropArea.height = Math.min(targetHeight, 100 - cropArea.y);
            }
            updateDisplay();
        },
        setCropArea(area) {
            cropArea = { ...area };
            updateDisplay();
        },
        reset() {
            cropArea = { x: 10, y: 10, width: 80, height: 80 };
            updateDisplay();
        },
        destroy() {
            overlay.remove();
            style.remove();
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleEnd);
            document.removeEventListener('touchmove', handleMove);
            document.removeEventListener('touchend', handleEnd);
        }
    };
}
