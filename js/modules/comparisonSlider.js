/**
 * Before/After Comparison Slider Module
 * Creates an interactive slider to compare original and processed images
 */

/**
 * Create a comparison slider element
 * @param {string} beforeSrc - Data URL or URL for before image
 * @param {string} afterSrc - Data URL or URL for after image
 * @param {Object} options - Configuration options
 * @returns {HTMLElement} - Comparison slider element
 */
export function createComparisonSlider(beforeSrc, afterSrc, options = {}) {
    const {
        width = '100%',
        height = 'auto',
        initialPosition = 50, // Percentage
        beforeLabel = 'Before',
        afterLabel = 'After'
    } = options;

    // Create container
    const container = document.createElement('div');
    container.className = 'comparison-slider';
    container.style.cssText = `
        position: relative;
        width: ${width};
        overflow: hidden;
        border-radius: 0.75rem;
        user-select: none;
        touch-action: none;
    `;

    // Create after image (background)
    const afterImg = document.createElement('img');
    afterImg.src = afterSrc;
    afterImg.alt = afterLabel;
    afterImg.style.cssText = `
        display: block;
        width: 100%;
        height: auto;
    `;
    afterImg.draggable = false;

    // Create before image container (clipped)
    const beforeContainer = document.createElement('div');
    beforeContainer.className = 'before-container';
    beforeContainer.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: ${initialPosition}%;
        height: 100%;
        overflow: hidden;
    `;

    const beforeImg = document.createElement('img');
    beforeImg.src = beforeSrc;
    beforeImg.alt = beforeLabel;
    beforeImg.style.cssText = `
        display: block;
        width: auto;
        height: 100%;
        max-width: none;
    `;
    beforeImg.draggable = false;

    beforeContainer.appendChild(beforeImg);

    // Create slider handle
    const handle = document.createElement('div');
    handle.className = 'slider-handle';
    handle.style.cssText = `
        position: absolute;
        top: 0;
        left: ${initialPosition}%;
        width: 4px;
        height: 100%;
        background: white;
        cursor: ew-resize;
        transform: translateX(-50%);
        box-shadow: 0 0 10px rgba(0,0,0,0.3);
        z-index: 10;
    `;

    // Handle circle
    const handleCircle = document.createElement('div');
    handleCircle.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 40px;
        height: 40px;
        background: white;
        border-radius: 50%;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    handleCircle.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2">
            <path d="M8 6l-4 6 4 6M16 6l4 6-4 6"/>
        </svg>
    `;
    handle.appendChild(handleCircle);

    // Create labels
    const beforeLabelEl = document.createElement('div');
    beforeLabelEl.className = 'comparison-label before-label';
    beforeLabelEl.textContent = beforeLabel;
    beforeLabelEl.style.cssText = `
        position: absolute;
        top: 10px;
        left: 10px;
        background: rgba(0,0,0,0.6);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 600;
        z-index: 5;
    `;

    const afterLabelEl = document.createElement('div');
    afterLabelEl.className = 'comparison-label after-label';
    afterLabelEl.textContent = afterLabel;
    afterLabelEl.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        background: rgba(13, 127, 242, 0.8);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 600;
        z-index: 5;
    `;

    // Assemble
    container.appendChild(afterImg);
    container.appendChild(beforeContainer);
    container.appendChild(handle);
    container.appendChild(beforeLabelEl);
    container.appendChild(afterLabelEl);

    // Add interaction handlers
    let isDragging = false;

    const updatePosition = (clientX) => {
        const rect = container.getBoundingClientRect();
        let position = ((clientX - rect.left) / rect.width) * 100;
        position = Math.max(0, Math.min(100, position));

        beforeContainer.style.width = `${position}%`;
        handle.style.left = `${position}%`;

        // Update before image width to maintain proper display
        const containerWidth = rect.width;
        beforeImg.style.width = `${containerWidth}px`;
    };

    const onStart = (e) => {
        isDragging = true;
        container.style.cursor = 'ew-resize';
        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        updatePosition(clientX);
    };

    const onMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        updatePosition(clientX);
    };

    const onEnd = () => {
        isDragging = false;
        container.style.cursor = 'default';
    };

    // Mouse events
    container.addEventListener('mousedown', onStart);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);

    // Touch events
    container.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);

    // Update before image width on load
    afterImg.onload = () => {
        const rect = container.getBoundingClientRect();
        beforeImg.style.width = `${rect.width}px`;
    };

    // Cleanup function
    container.cleanup = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onEnd);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onEnd);
    };

    return container;
}

/**
 * Create comparison from canvas elements
 * @param {HTMLCanvasElement} beforeCanvas
 * @param {HTMLCanvasElement} afterCanvas
 * @param {Object} options
 * @returns {HTMLElement}
 */
export function createComparisonFromCanvas(beforeCanvas, afterCanvas, options = {}) {
    const beforeSrc = beforeCanvas.toDataURL('image/jpeg', 0.9);
    const afterSrc = afterCanvas.toDataURL('image/jpeg', 0.9);
    return createComparisonSlider(beforeSrc, afterSrc, options);
}

/**
 * Side by side comparison (non-interactive)
 * @param {string} beforeSrc
 * @param {string} afterSrc
 * @param {Object} options
 * @returns {HTMLElement}
 */
export function createSideBySide(beforeSrc, afterSrc, options = {}) {
    const {
        beforeLabel = 'Original',
        afterLabel = 'Optimized',
        gap = '10px'
    } = options;

    const container = document.createElement('div');
    container.style.cssText = `
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: ${gap};
    `;

    const createPanel = (src, label) => {
        const panel = document.createElement('div');
        panel.style.cssText = `
            position: relative;
            border-radius: 0.5rem;
            overflow: hidden;
        `;

        const img = document.createElement('img');
        img.src = src;
        img.style.cssText = `
            width: 100%;
            height: auto;
            display: block;
        `;

        const labelEl = document.createElement('div');
        labelEl.textContent = label;
        labelEl.style.cssText = `
            position: absolute;
            bottom: 8px;
            left: 8px;
            background: rgba(0,0,0,0.6);
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
        `;

        panel.appendChild(img);
        panel.appendChild(labelEl);
        return panel;
    };

    container.appendChild(createPanel(beforeSrc, beforeLabel));
    container.appendChild(createPanel(afterSrc, afterLabel));

    return container;
}
