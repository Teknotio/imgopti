/**
 * Drag Reorder Module
 * Drag and drop file reordering
 */

/**
 * Create drag reorder functionality
 * @param {HTMLElement} container - Container with draggable items
 * @param {Object} options - Configuration options
 * @returns {Object} - Drag reorder controller
 */
export function createDragReorder(container, options = {}) {
    const {
        itemSelector = '.file-item',
        handleSelector = null, // If null, entire item is draggable
        onReorder = () => {},
        animation = true,
        animationDuration = 200
    } = options;

    let draggedItem = null;
    let draggedIndex = -1;
    let placeholder = null;
    let items = [];

    // Add styles
    const style = document.createElement('style');
    style.id = 'drag-reorder-style';
    if (!document.getElementById('drag-reorder-style')) {
        style.textContent = `
            .drag-item {
                cursor: grab;
                transition: transform ${animationDuration}ms ease, opacity ${animationDuration}ms ease;
            }
            .drag-item:active {
                cursor: grabbing;
            }
            .drag-item.dragging {
                opacity: 0.5;
                transform: scale(1.02);
                z-index: 100;
            }
            .drag-placeholder {
                background: rgba(13, 127, 242, 0.2);
                border: 2px dashed #0d7ff2;
                border-radius: 8px;
                transition: all ${animationDuration}ms ease;
            }
            .drag-item.drag-over {
                transform: translateY(10px);
            }
            .drag-handle {
                cursor: grab;
            }
            .drag-handle:active {
                cursor: grabbing;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Initialize items
     */
    function initItems() {
        items = Array.from(container.querySelectorAll(itemSelector));
        items.forEach((item, index) => {
            item.classList.add('drag-item');
            item.setAttribute('draggable', 'true');
            item.dataset.dragIndex = index;

            // If handle specified, only handle starts drag
            if (handleSelector) {
                item.setAttribute('draggable', 'false');
                const handle = item.querySelector(handleSelector);
                if (handle) {
                    handle.classList.add('drag-handle');
                    handle.addEventListener('mousedown', () => {
                        item.setAttribute('draggable', 'true');
                    });
                    handle.addEventListener('mouseup', () => {
                        item.setAttribute('draggable', 'false');
                    });
                }
            }
        });
    }

    /**
     * Create placeholder element
     */
    function createPlaceholder(referenceElement) {
        placeholder = document.createElement('div');
        placeholder.className = 'drag-placeholder';
        placeholder.style.width = `${referenceElement.offsetWidth}px`;
        placeholder.style.height = `${referenceElement.offsetHeight}px`;
        return placeholder;
    }

    /**
     * Get index of element in container
     */
    function getItemIndex(element) {
        return Array.from(container.querySelectorAll(itemSelector)).indexOf(element);
    }

    /**
     * Get closest item from point
     */
    function getClosestItem(x, y, excludeItem) {
        const draggableItems = Array.from(container.querySelectorAll(itemSelector))
            .filter(item => item !== excludeItem && item !== placeholder);

        let closest = null;
        let closestDistance = Infinity;

        draggableItems.forEach(item => {
            const rect = item.getBoundingClientRect();
            const centerY = rect.top + rect.height / 2;
            const distance = Math.abs(y - centerY);

            if (distance < closestDistance) {
                closestDistance = distance;
                closest = {
                    element: item,
                    insertBefore: y < centerY
                };
            }
        });

        return closest;
    }

    // Drag event handlers
    function handleDragStart(e) {
        const item = e.target.closest(itemSelector);
        if (!item) return;

        draggedItem = item;
        draggedIndex = getItemIndex(item);

        // Set drag data
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', draggedIndex);

        // Add visual feedback
        setTimeout(() => {
            item.classList.add('dragging');
        }, 0);

        // Create placeholder
        createPlaceholder(item);
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        if (!draggedItem) return;

        const closest = getClosestItem(e.clientX, e.clientY, draggedItem);

        if (closest) {
            const rect = closest.element.getBoundingClientRect();
            const insertBefore = e.clientY < rect.top + rect.height / 2;

            // Insert placeholder
            if (placeholder.parentNode) {
                placeholder.remove();
            }

            if (insertBefore) {
                closest.element.parentNode.insertBefore(placeholder, closest.element);
            } else {
                closest.element.parentNode.insertBefore(placeholder, closest.element.nextSibling);
            }
        }
    }

    function handleDragEnter(e) {
        e.preventDefault();
        const item = e.target.closest(itemSelector);
        if (item && item !== draggedItem) {
            item.classList.add('drag-over');
        }
    }

    function handleDragLeave(e) {
        const item = e.target.closest(itemSelector);
        if (item) {
            item.classList.remove('drag-over');
        }
    }

    function handleDrop(e) {
        e.preventDefault();

        if (!draggedItem || !placeholder) return;

        // Insert item at placeholder position
        placeholder.parentNode.insertBefore(draggedItem, placeholder);
        placeholder.remove();

        // Clean up
        draggedItem.classList.remove('dragging');
        items.forEach(item => item.classList.remove('drag-over'));

        // Get new order
        const newIndex = getItemIndex(draggedItem);

        if (newIndex !== draggedIndex) {
            // Notify of reorder
            const newOrder = Array.from(container.querySelectorAll(itemSelector))
                .map(item => parseInt(item.dataset.dragIndex));

            onReorder({
                oldIndex: draggedIndex,
                newIndex: newIndex,
                order: newOrder
            });

            // Update indices
            initItems();
        }

        draggedItem = null;
        draggedIndex = -1;
        placeholder = null;
    }

    function handleDragEnd(e) {
        if (draggedItem) {
            draggedItem.classList.remove('dragging');
        }

        items.forEach(item => item.classList.remove('drag-over'));

        if (placeholder && placeholder.parentNode) {
            placeholder.remove();
        }

        draggedItem = null;
        draggedIndex = -1;
        placeholder = null;
    }

    // Touch support
    let touchStartY = 0;
    let touchCurrentItem = null;
    let touchClone = null;

    function handleTouchStart(e) {
        const item = e.target.closest(itemSelector);
        if (!item) return;

        if (handleSelector && !e.target.closest(handleSelector)) return;

        touchCurrentItem = item;
        touchStartY = e.touches[0].clientY;
        draggedIndex = getItemIndex(item);

        // Create visual clone
        const rect = item.getBoundingClientRect();
        touchClone = item.cloneNode(true);
        touchClone.style.cssText = `
            position: fixed;
            left: ${rect.left}px;
            top: ${rect.top}px;
            width: ${rect.width}px;
            height: ${rect.height}px;
            opacity: 0.8;
            z-index: 1000;
            pointer-events: none;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        `;
        document.body.appendChild(touchClone);

        item.classList.add('dragging');
        createPlaceholder(item);
    }

    function handleTouchMove(e) {
        if (!touchCurrentItem || !touchClone) return;
        e.preventDefault();

        const touch = e.touches[0];
        const deltaY = touch.clientY - touchStartY;

        // Move clone
        const rect = touchCurrentItem.getBoundingClientRect();
        touchClone.style.top = `${rect.top + deltaY}px`;

        // Find drop position
        const closest = getClosestItem(touch.clientX, touch.clientY, touchCurrentItem);

        if (closest && placeholder) {
            if (placeholder.parentNode) {
                placeholder.remove();
            }
            if (closest.insertBefore) {
                closest.element.parentNode.insertBefore(placeholder, closest.element);
            } else {
                closest.element.parentNode.insertBefore(placeholder, closest.element.nextSibling);
            }
        }
    }

    function handleTouchEnd(e) {
        if (!touchCurrentItem) return;

        // Insert at placeholder
        if (placeholder && placeholder.parentNode) {
            placeholder.parentNode.insertBefore(touchCurrentItem, placeholder);
            placeholder.remove();
        }

        // Clean up
        touchCurrentItem.classList.remove('dragging');
        if (touchClone) {
            touchClone.remove();
            touchClone = null;
        }

        // Get new order
        const newIndex = getItemIndex(touchCurrentItem);

        if (newIndex !== draggedIndex) {
            const newOrder = Array.from(container.querySelectorAll(itemSelector))
                .map(item => parseInt(item.dataset.dragIndex));

            onReorder({
                oldIndex: draggedIndex,
                newIndex: newIndex,
                order: newOrder
            });

            initItems();
        }

        touchCurrentItem = null;
        draggedIndex = -1;
        placeholder = null;
    }

    // Attach event listeners
    container.addEventListener('dragstart', handleDragStart);
    container.addEventListener('dragover', handleDragOver);
    container.addEventListener('dragenter', handleDragEnter);
    container.addEventListener('dragleave', handleDragLeave);
    container.addEventListener('drop', handleDrop);
    container.addEventListener('dragend', handleDragEnd);

    // Touch events
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    // Initialize
    initItems();

    return {
        refresh() {
            initItems();
        },
        getOrder() {
            return Array.from(container.querySelectorAll(itemSelector))
                .map(item => parseInt(item.dataset.dragIndex));
        },
        setOrder(order) {
            const itemsMap = new Map();
            items.forEach(item => {
                itemsMap.set(parseInt(item.dataset.dragIndex), item);
            });

            order.forEach(index => {
                const item = itemsMap.get(index);
                if (item) {
                    container.appendChild(item);
                }
            });

            initItems();
        },
        destroy() {
            container.removeEventListener('dragstart', handleDragStart);
            container.removeEventListener('dragover', handleDragOver);
            container.removeEventListener('dragenter', handleDragEnter);
            container.removeEventListener('dragleave', handleDragLeave);
            container.removeEventListener('drop', handleDrop);
            container.removeEventListener('dragend', handleDragEnd);
            container.removeEventListener('touchstart', handleTouchStart);
            container.removeEventListener('touchmove', handleTouchMove);
            container.removeEventListener('touchend', handleTouchEnd);

            items.forEach(item => {
                item.classList.remove('drag-item');
                item.removeAttribute('draggable');
            });
        }
    };
}
