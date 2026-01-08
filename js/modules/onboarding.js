/**
 * Onboarding Tour Module
 * Interactive guided tour for first-time users
 */

const STORAGE_KEY = 'imgopti_onboarding_complete';

/**
 * Check if onboarding has been completed
 * @returns {boolean}
 */
export function isOnboardingComplete() {
    return localStorage.getItem(STORAGE_KEY) === 'true';
}

/**
 * Mark onboarding as complete
 */
export function completeOnboarding() {
    localStorage.setItem(STORAGE_KEY, 'true');
}

/**
 * Reset onboarding status
 */
export function resetOnboarding() {
    localStorage.removeItem(STORAGE_KEY);
}

/**
 * Default tour steps
 */
export const DEFAULT_STEPS = [
    {
        id: 'welcome',
        title: 'Welcome to ImgOpti!',
        content: 'Your free, privacy-first image optimizer. All processing happens in your browser - your images never leave your device.',
        target: null, // No target = modal
        icon: 'waving_hand'
    },
    {
        id: 'upload',
        title: 'Upload Images',
        content: 'Drag and drop images here, or click to browse. You can upload multiple images at once for batch processing.',
        target: '.upload-area, .drop-zone, #uploadArea',
        position: 'bottom',
        icon: 'upload_file'
    },
    {
        id: 'format',
        title: 'Choose Format',
        content: 'Select your output format. WebP offers the best compression, JPEG is universally compatible, PNG preserves transparency.',
        target: '.format-options, .format-selector, #formatSelector',
        position: 'right',
        icon: 'image'
    },
    {
        id: 'quality',
        title: 'Adjust Quality',
        content: 'Use the slider to balance quality vs file size. 80% is a good starting point for most images.',
        target: '.quality-slider, #qualitySlider',
        position: 'top',
        icon: 'tune'
    },
    {
        id: 'resize',
        title: 'Resize Options',
        content: 'Optionally resize your images. Lock the aspect ratio to maintain proportions.',
        target: '.resize-options, #resizeOptions',
        position: 'left',
        icon: 'aspect_ratio'
    },
    {
        id: 'process',
        title: 'Process & Download',
        content: 'Click to process your images. You can download them individually or as a ZIP file.',
        target: '.process-btn, #processBtn, .save-btn',
        position: 'top',
        icon: 'download'
    },
    {
        id: 'done',
        title: 'You\'re All Set!',
        content: 'Start optimizing your images now. Click the help icon anytime to replay this tour.',
        target: null,
        icon: 'celebration'
    }
];

/**
 * Create onboarding tour
 * @param {Object} options - Configuration options
 * @returns {Object} - Tour controller
 */
export function createOnboarding(options = {}) {
    const {
        steps = DEFAULT_STEPS,
        onComplete = () => {},
        onStepChange = () => {},
        showOnFirstVisit = true,
        allowSkip = true
    } = options;

    let currentStep = 0;
    let isActive = false;
    let overlay = null;
    let tooltip = null;
    let spotlight = null;

    // Add styles
    const style = document.createElement('style');
    style.id = 'onboarding-style';
    if (!document.getElementById('onboarding-style')) {
        style.textContent = `
            .onboarding-overlay {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.8);
                z-index: 9998;
                transition: opacity 0.3s ease;
            }
            .onboarding-spotlight {
                position: fixed;
                box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.8);
                border-radius: 8px;
                z-index: 9999;
                transition: all 0.3s ease;
                pointer-events: none;
            }
            .onboarding-tooltip {
                position: fixed;
                width: 340px;
                background: #1a2634;
                border-radius: 16px;
                padding: 24px;
                z-index: 10000;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                animation: tooltipFadeIn 0.3s ease;
            }
            @keyframes tooltipFadeIn {
                from {
                    opacity: 0;
                    transform: translateY(10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            .onboarding-tooltip.center {
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%);
            }
            .onboarding-arrow {
                position: absolute;
                width: 16px;
                height: 16px;
                background: #1a2634;
                transform: rotate(45deg);
            }
            .onboarding-tooltip.top .onboarding-arrow {
                bottom: -8px;
                left: calc(50% - 8px);
            }
            .onboarding-tooltip.bottom .onboarding-arrow {
                top: -8px;
                left: calc(50% - 8px);
            }
            .onboarding-tooltip.left .onboarding-arrow {
                right: -8px;
                top: calc(50% - 8px);
            }
            .onboarding-tooltip.right .onboarding-arrow {
                left: -8px;
                top: calc(50% - 8px);
            }
            .onboarding-icon {
                width: 56px;
                height: 56px;
                background: linear-gradient(135deg, #0d7ff2, #6366f1);
                border-radius: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 16px;
            }
            .onboarding-icon .material-symbols-outlined {
                font-size: 32px;
                color: white;
            }
            .onboarding-title {
                font-size: 20px;
                font-weight: 700;
                color: white;
                margin-bottom: 8px;
            }
            .onboarding-content {
                font-size: 14px;
                line-height: 1.6;
                color: #9ca3af;
                margin-bottom: 20px;
            }
            .onboarding-progress {
                display: flex;
                gap: 6px;
                margin-bottom: 20px;
            }
            .onboarding-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #374151;
                transition: all 0.2s;
            }
            .onboarding-dot.active {
                background: #0d7ff2;
                width: 24px;
                border-radius: 4px;
            }
            .onboarding-dot.complete {
                background: #10b981;
            }
            .onboarding-buttons {
                display: flex;
                gap: 12px;
            }
            .onboarding-btn {
                flex: 1;
                padding: 12px 20px;
                border: none;
                border-radius: 10px;
                font-weight: 600;
                font-size: 14px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                transition: all 0.15s;
            }
            .onboarding-btn.primary {
                background: #0d7ff2;
                color: white;
            }
            .onboarding-btn.primary:hover {
                background: #0b6ed1;
            }
            .onboarding-btn.secondary {
                background: transparent;
                color: #6b7280;
                border: 1px solid #374151;
            }
            .onboarding-btn.secondary:hover {
                background: rgba(255,255,255,0.05);
                color: white;
            }
            .onboarding-skip {
                position: absolute;
                top: 16px;
                right: 16px;
                background: transparent;
                border: none;
                color: #6b7280;
                cursor: pointer;
                padding: 4px;
                border-radius: 4px;
            }
            .onboarding-skip:hover {
                background: rgba(255,255,255,0.1);
                color: white;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Show step
     * @param {number} index
     */
    function showStep(index) {
        const step = steps[index];
        if (!step) return;

        currentStep = index;
        onStepChange(step, index);

        // Remove existing elements
        cleanup();

        // Create overlay
        overlay = document.createElement('div');
        overlay.className = 'onboarding-overlay';
        document.body.appendChild(overlay);

        // Find target element
        let targetEl = null;
        if (step.target) {
            const selectors = step.target.split(', ');
            for (const selector of selectors) {
                targetEl = document.querySelector(selector);
                if (targetEl) break;
            }
        }

        // Create spotlight if target exists
        if (targetEl) {
            const rect = targetEl.getBoundingClientRect();
            const padding = 8;

            spotlight = document.createElement('div');
            spotlight.className = 'onboarding-spotlight';
            spotlight.style.left = `${rect.left - padding}px`;
            spotlight.style.top = `${rect.top - padding}px`;
            spotlight.style.width = `${rect.width + padding * 2}px`;
            spotlight.style.height = `${rect.height + padding * 2}px`;
            document.body.appendChild(spotlight);

            // Remove overlay background when spotlight exists
            overlay.style.background = 'transparent';
        }

        // Create tooltip
        tooltip = document.createElement('div');
        tooltip.className = `onboarding-tooltip ${step.target ? step.position || 'bottom' : 'center'}`;
        tooltip.innerHTML = `
            ${allowSkip ? `
                <button class="onboarding-skip" title="Skip tour">
                    <span class="material-symbols-outlined">close</span>
                </button>
            ` : ''}
            <div class="onboarding-icon">
                <span class="material-symbols-outlined">${step.icon || 'info'}</span>
            </div>
            <div class="onboarding-title">${step.title}</div>
            <div class="onboarding-content">${step.content}</div>
            <div class="onboarding-progress">
                ${steps.map((_, i) => `
                    <div class="onboarding-dot ${i < currentStep ? 'complete' : ''} ${i === currentStep ? 'active' : ''}"></div>
                `).join('')}
            </div>
            <div class="onboarding-buttons">
                ${index > 0 ? `
                    <button class="onboarding-btn secondary prev-btn">
                        <span class="material-symbols-outlined">arrow_back</span>
                        Back
                    </button>
                ` : ''}
                <button class="onboarding-btn primary next-btn">
                    ${index === steps.length - 1 ? 'Get Started' : 'Next'}
                    ${index < steps.length - 1 ? '<span class="material-symbols-outlined">arrow_forward</span>' : ''}
                </button>
            </div>
            ${step.target ? '<div class="onboarding-arrow"></div>' : ''}
        `;

        document.body.appendChild(tooltip);

        // Position tooltip relative to target
        if (targetEl) {
            positionTooltip(targetEl, step.position || 'bottom');
        }

        // Event handlers
        tooltip.querySelector('.next-btn').addEventListener('click', () => {
            if (currentStep < steps.length - 1) {
                showStep(currentStep + 1);
            } else {
                end(true);
            }
        });

        const prevBtn = tooltip.querySelector('.prev-btn');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                showStep(currentStep - 1);
            });
        }

        const skipBtn = tooltip.querySelector('.onboarding-skip');
        if (skipBtn) {
            skipBtn.addEventListener('click', () => end(false));
        }
    }

    /**
     * Position tooltip relative to target
     */
    function positionTooltip(target, position) {
        const rect = target.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        const padding = 16;

        let left, top;

        switch (position) {
            case 'top':
                left = rect.left + (rect.width - tooltipRect.width) / 2;
                top = rect.top - tooltipRect.height - padding;
                break;
            case 'bottom':
                left = rect.left + (rect.width - tooltipRect.width) / 2;
                top = rect.bottom + padding;
                break;
            case 'left':
                left = rect.left - tooltipRect.width - padding;
                top = rect.top + (rect.height - tooltipRect.height) / 2;
                break;
            case 'right':
                left = rect.right + padding;
                top = rect.top + (rect.height - tooltipRect.height) / 2;
                break;
        }

        // Keep on screen
        left = Math.max(padding, Math.min(window.innerWidth - tooltipRect.width - padding, left));
        top = Math.max(padding, Math.min(window.innerHeight - tooltipRect.height - padding, top));

        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
        tooltip.classList.remove('center');
    }

    /**
     * Clean up DOM elements
     */
    function cleanup() {
        if (overlay) {
            overlay.remove();
            overlay = null;
        }
        if (tooltip) {
            tooltip.remove();
            tooltip = null;
        }
        if (spotlight) {
            spotlight.remove();
            spotlight = null;
        }
    }

    /**
     * End the tour
     */
    function end(completed = true) {
        cleanup();
        isActive = false;
        if (completed) {
            completeOnboarding();
        }
        onComplete(completed);
    }

    /**
     * Start the tour
     */
    function start() {
        if (isActive) return;
        isActive = true;
        showStep(0);
    }

    // Auto-start on first visit
    if (showOnFirstVisit && !isOnboardingComplete()) {
        // Delay to allow page to render
        setTimeout(start, 500);
    }

    return {
        start,
        end,
        next() {
            if (currentStep < steps.length - 1) {
                showStep(currentStep + 1);
            }
        },
        prev() {
            if (currentStep > 0) {
                showStep(currentStep - 1);
            }
        },
        goTo(index) {
            if (index >= 0 && index < steps.length) {
                showStep(index);
            }
        },
        getCurrentStep() {
            return { step: steps[currentStep], index: currentStep };
        },
        isActive() {
            return isActive;
        },
        reset: resetOnboarding,
        destroy() {
            cleanup();
            style.remove();
        }
    };
}
