/**
 * History Manager Module
 * Handles undo/redo functionality for image editing
 */

class HistoryManager {
    constructor(maxStates = 20) {
        this.maxStates = maxStates;
        this.states = [];
        this.currentIndex = -1;
        this.listeners = new Set();
    }

    /**
     * Push a new state onto the history stack
     * @param {HTMLCanvasElement} canvas - Canvas state to save
     * @param {string} actionName - Description of the action
     */
    push(canvas, actionName = 'Edit') {
        // Remove any states after current index (redo states)
        this.states = this.states.slice(0, this.currentIndex + 1);

        // Create a copy of the canvas
        const stateCopy = document.createElement('canvas');
        stateCopy.width = canvas.width;
        stateCopy.height = canvas.height;
        const ctx = stateCopy.getContext('2d');
        ctx.drawImage(canvas, 0, 0);

        // Add new state
        this.states.push({
            canvas: stateCopy,
            action: actionName,
            timestamp: Date.now()
        });

        // Remove oldest states if exceeding max
        while (this.states.length > this.maxStates) {
            this.states.shift();
        }

        this.currentIndex = this.states.length - 1;
        this._notifyListeners();
    }

    /**
     * Undo to previous state
     * @returns {HTMLCanvasElement|null} - Previous state canvas or null
     */
    undo() {
        if (!this.canUndo()) {
            return null;
        }

        this.currentIndex--;
        this._notifyListeners();
        return this.getCurrentCanvas();
    }

    /**
     * Redo to next state
     * @returns {HTMLCanvasElement|null} - Next state canvas or null
     */
    redo() {
        if (!this.canRedo()) {
            return null;
        }

        this.currentIndex++;
        this._notifyListeners();
        return this.getCurrentCanvas();
    }

    /**
     * Check if undo is available
     * @returns {boolean}
     */
    canUndo() {
        return this.currentIndex > 0;
    }

    /**
     * Check if redo is available
     * @returns {boolean}
     */
    canRedo() {
        return this.currentIndex < this.states.length - 1;
    }

    /**
     * Get current canvas state
     * @returns {HTMLCanvasElement|null}
     */
    getCurrentCanvas() {
        if (this.currentIndex < 0 || this.currentIndex >= this.states.length) {
            return null;
        }

        const state = this.states[this.currentIndex];

        // Return a copy to prevent modification
        const copy = document.createElement('canvas');
        copy.width = state.canvas.width;
        copy.height = state.canvas.height;
        const ctx = copy.getContext('2d');
        ctx.drawImage(state.canvas, 0, 0);

        return copy;
    }

    /**
     * Get current action name
     * @returns {string}
     */
    getCurrentActionName() {
        if (this.currentIndex < 0 || this.currentIndex >= this.states.length) {
            return '';
        }
        return this.states[this.currentIndex].action;
    }

    /**
     * Get history info
     * @returns {Object}
     */
    getInfo() {
        return {
            totalStates: this.states.length,
            currentIndex: this.currentIndex,
            canUndo: this.canUndo(),
            canRedo: this.canRedo(),
            undoAction: this.currentIndex > 0 ? this.states[this.currentIndex - 1]?.action : null,
            redoAction: this.currentIndex < this.states.length - 1 ? this.states[this.currentIndex + 1]?.action : null
        };
    }

    /**
     * Clear all history
     */
    clear() {
        this.states = [];
        this.currentIndex = -1;
        this._notifyListeners();
    }

    /**
     * Subscribe to history changes
     * @param {Function} callback
     * @returns {Function} - Unsubscribe function
     */
    subscribe(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    /**
     * Notify all listeners of state change
     * @private
     */
    _notifyListeners() {
        const info = this.getInfo();
        this.listeners.forEach(cb => {
            try {
                cb(info);
            } catch (e) {
                console.error('History listener error:', e);
            }
        });
    }
}

// Export singleton instance
export const history = new HistoryManager();

// Also export class for creating multiple instances
export { HistoryManager };
