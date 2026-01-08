/**
 * Drawing/Annotation Tools Module
 * Brush, shapes, arrows, text annotations
 */

/**
 * Available tools
 */
export const DRAWING_TOOLS = {
    brush: { label: 'Brush', icon: 'brush', cursor: 'crosshair' },
    pencil: { label: 'Pencil', icon: 'edit', cursor: 'crosshair' },
    eraser: { label: 'Eraser', icon: 'ink_eraser', cursor: 'cell' },
    line: { label: 'Line', icon: 'horizontal_rule', cursor: 'crosshair' },
    arrow: { label: 'Arrow', icon: 'arrow_forward', cursor: 'crosshair' },
    rectangle: { label: 'Rectangle', icon: 'rectangle', cursor: 'crosshair' },
    circle: { label: 'Circle', icon: 'circle', cursor: 'crosshair' },
    text: { label: 'Text', icon: 'text_fields', cursor: 'text' },
    highlight: { label: 'Highlight', icon: 'highlight', cursor: 'crosshair' }
};

/**
 * Default drawing settings
 */
export const DEFAULT_SETTINGS = {
    tool: 'brush',
    color: '#ff0000',
    size: 5,
    opacity: 100,
    fill: false,
    fontSize: 24,
    fontFamily: 'Arial'
};

/**
 * Create drawing canvas overlay
 * @param {HTMLElement} container - Container element
 * @param {Object} options - Configuration options
 * @returns {Object} - Drawing controller
 */
export function createDrawingCanvas(container, options = {}) {
    const {
        width = container.clientWidth,
        height = container.clientHeight,
        settings = {},
        onChange = () => {},
        onToolChange = () => {}
    } = options;

    let currentSettings = { ...DEFAULT_SETTINGS, ...settings };
    let isDrawing = false;
    let startPoint = null;
    let currentPath = [];
    let shapes = [];
    let undoStack = [];
    let redoStack = [];

    // Create canvas element
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.className = 'drawing-canvas';
    canvas.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        cursor: ${DRAWING_TOOLS[currentSettings.tool]?.cursor || 'crosshair'};
        touch-action: none;
    `;

    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Temporary canvas for shape preview
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.lineCap = 'round';
    tempCtx.lineJoin = 'round';

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .drawing-canvas {
            z-index: 50;
        }
        .drawing-toolbar {
            position: absolute;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(16, 25, 34, 0.95);
            border-radius: 12px;
            padding: 8px;
            display: flex;
            gap: 4px;
            z-index: 100;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }
        .drawing-tool-btn {
            width: 40px;
            height: 40px;
            border: none;
            background: transparent;
            color: #9ca3af;
            border-radius: 8px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.15s;
        }
        .drawing-tool-btn:hover {
            background: rgba(255,255,255,0.1);
            color: white;
        }
        .drawing-tool-btn.active {
            background: #0d7ff2;
            color: white;
        }
        .drawing-settings {
            display: flex;
            align-items: center;
            gap: 12px;
            padding-left: 12px;
            border-left: 1px solid rgba(255,255,255,0.1);
            margin-left: 8px;
        }
        .drawing-color-picker {
            width: 32px;
            height: 32px;
            border: 2px solid white;
            border-radius: 50%;
            cursor: pointer;
            padding: 0;
            overflow: hidden;
        }
        .drawing-color-picker::-webkit-color-swatch-wrapper {
            padding: 0;
        }
        .drawing-color-picker::-webkit-color-swatch {
            border: none;
            border-radius: 50%;
        }
        .drawing-size-slider {
            width: 80px;
            height: 4px;
            border-radius: 2px;
            background: #374151;
            -webkit-appearance: none;
        }
        .drawing-size-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: white;
            cursor: pointer;
        }
        .text-input-overlay {
            position: absolute;
            background: transparent;
            border: 2px dashed #0d7ff2;
            outline: none;
            font-family: inherit;
            padding: 4px;
            min-width: 100px;
            min-height: 30px;
            z-index: 200;
        }
    `;
    document.head.appendChild(style);

    // Create toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'drawing-toolbar';
    toolbar.innerHTML = `
        ${Object.entries(DRAWING_TOOLS).map(([key, tool]) => `
            <button class="drawing-tool-btn ${key === currentSettings.tool ? 'active' : ''}" data-tool="${key}" title="${tool.label}">
                <span class="material-symbols-outlined">${tool.icon}</span>
            </button>
        `).join('')}
        <div class="drawing-settings">
            <input type="color" class="drawing-color-picker" value="${currentSettings.color}" title="Color">
            <input type="range" class="drawing-size-slider" min="1" max="50" value="${currentSettings.size}" title="Size">
        </div>
    `;

    // Utility functions
    function getPoint(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: (clientX - rect.left) * (canvas.width / rect.width),
            y: (clientY - rect.top) * (canvas.height / rect.height)
        };
    }

    function setStyle(context) {
        context.strokeStyle = currentSettings.color;
        context.fillStyle = currentSettings.color;
        context.lineWidth = currentSettings.size;
        context.globalAlpha = currentSettings.opacity / 100;

        if (currentSettings.tool === 'highlight') {
            context.globalAlpha = 0.3;
            context.globalCompositeOperation = 'multiply';
        } else if (currentSettings.tool === 'eraser') {
            context.globalCompositeOperation = 'destination-out';
        } else {
            context.globalCompositeOperation = 'source-over';
        }
    }

    function drawShape(context, shape) {
        context.save();
        context.strokeStyle = shape.color;
        context.fillStyle = shape.color;
        context.lineWidth = shape.size;
        context.globalAlpha = shape.opacity / 100;

        if (shape.tool === 'highlight') {
            context.globalAlpha = 0.3;
            context.globalCompositeOperation = 'multiply';
        } else if (shape.tool === 'eraser') {
            context.globalCompositeOperation = 'destination-out';
        }

        switch (shape.type) {
            case 'path':
                if (shape.points.length > 0) {
                    context.beginPath();
                    context.moveTo(shape.points[0].x, shape.points[0].y);
                    for (let i = 1; i < shape.points.length; i++) {
                        context.lineTo(shape.points[i].x, shape.points[i].y);
                    }
                    context.stroke();
                }
                break;

            case 'line':
                context.beginPath();
                context.moveTo(shape.start.x, shape.start.y);
                context.lineTo(shape.end.x, shape.end.y);
                context.stroke();
                break;

            case 'arrow':
                drawArrow(context, shape.start, shape.end, shape.size);
                break;

            case 'rectangle':
                const rectW = shape.end.x - shape.start.x;
                const rectH = shape.end.y - shape.start.y;
                if (shape.fill) {
                    context.fillRect(shape.start.x, shape.start.y, rectW, rectH);
                } else {
                    context.strokeRect(shape.start.x, shape.start.y, rectW, rectH);
                }
                break;

            case 'circle':
                const radius = Math.sqrt(
                    Math.pow(shape.end.x - shape.start.x, 2) +
                    Math.pow(shape.end.y - shape.start.y, 2)
                );
                context.beginPath();
                context.arc(shape.start.x, shape.start.y, radius, 0, Math.PI * 2);
                if (shape.fill) {
                    context.fill();
                } else {
                    context.stroke();
                }
                break;

            case 'text':
                context.font = `${shape.fontSize}px ${shape.fontFamily}`;
                context.fillText(shape.text, shape.position.x, shape.position.y);
                break;
        }

        context.restore();
    }

    function drawArrow(context, start, end, size) {
        const headLength = size * 3;
        const angle = Math.atan2(end.y - start.y, end.x - start.x);

        context.beginPath();
        context.moveTo(start.x, start.y);
        context.lineTo(end.x, end.y);
        context.stroke();

        context.beginPath();
        context.moveTo(end.x, end.y);
        context.lineTo(
            end.x - headLength * Math.cos(angle - Math.PI / 6),
            end.y - headLength * Math.sin(angle - Math.PI / 6)
        );
        context.moveTo(end.x, end.y);
        context.lineTo(
            end.x - headLength * Math.cos(angle + Math.PI / 6),
            end.y - headLength * Math.sin(angle + Math.PI / 6)
        );
        context.stroke();
    }

    function redrawAll() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        shapes.forEach(shape => drawShape(ctx, shape));
    }

    function saveState() {
        undoStack.push(JSON.stringify(shapes));
        redoStack = [];
        if (undoStack.length > 50) undoStack.shift();
    }

    // Event handlers
    function handleStart(e) {
        e.preventDefault();
        isDrawing = true;
        startPoint = getPoint(e);
        currentPath = [startPoint];

        if (currentSettings.tool === 'text') {
            showTextInput(startPoint);
            isDrawing = false;
            return;
        }

        setStyle(tempCtx);
    }

    function handleMove(e) {
        if (!isDrawing) return;
        e.preventDefault();

        const point = getPoint(e);

        // Clear temp canvas
        tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);

        if (['brush', 'pencil', 'eraser', 'highlight'].includes(currentSettings.tool)) {
            currentPath.push(point);
            setStyle(tempCtx);
            tempCtx.beginPath();
            tempCtx.moveTo(currentPath[0].x, currentPath[0].y);
            currentPath.forEach(p => tempCtx.lineTo(p.x, p.y));
            tempCtx.stroke();
        } else {
            // Preview shape
            setStyle(tempCtx);
            const previewShape = {
                type: currentSettings.tool,
                start: startPoint,
                end: point,
                color: currentSettings.color,
                size: currentSettings.size,
                opacity: currentSettings.opacity,
                fill: currentSettings.fill,
                tool: currentSettings.tool
            };
            drawShape(tempCtx, previewShape);
        }

        // Composite temp onto main
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        shapes.forEach(shape => drawShape(ctx, shape));
        ctx.drawImage(tempCanvas, 0, 0);
    }

    function handleEnd(e) {
        if (!isDrawing) return;
        isDrawing = false;

        const endPoint = e.changedTouches ?
            getPoint({ touches: e.changedTouches }) :
            getPoint(e);

        saveState();

        let newShape;
        if (['brush', 'pencil', 'eraser', 'highlight'].includes(currentSettings.tool)) {
            newShape = {
                type: 'path',
                points: [...currentPath],
                color: currentSettings.color,
                size: currentSettings.size,
                opacity: currentSettings.opacity,
                tool: currentSettings.tool
            };
        } else {
            newShape = {
                type: currentSettings.tool,
                start: startPoint,
                end: endPoint,
                color: currentSettings.color,
                size: currentSettings.size,
                opacity: currentSettings.opacity,
                fill: currentSettings.fill,
                tool: currentSettings.tool
            };
        }

        shapes.push(newShape);
        tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
        redrawAll();
        onChange(shapes);
    }

    function showTextInput(position) {
        const input = document.createElement('textarea');
        input.className = 'text-input-overlay';
        input.style.left = `${position.x}px`;
        input.style.top = `${position.y}px`;
        input.style.fontSize = `${currentSettings.fontSize}px`;
        input.style.fontFamily = currentSettings.fontFamily;
        input.style.color = currentSettings.color;

        container.appendChild(input);
        input.focus();

        input.addEventListener('blur', () => {
            if (input.value.trim()) {
                saveState();
                shapes.push({
                    type: 'text',
                    text: input.value,
                    position: { x: position.x, y: position.y + currentSettings.fontSize },
                    color: currentSettings.color,
                    fontSize: currentSettings.fontSize,
                    fontFamily: currentSettings.fontFamily,
                    opacity: currentSettings.opacity,
                    tool: 'text'
                });
                redrawAll();
                onChange(shapes);
            }
            input.remove();
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                input.remove();
            } else if (e.key === 'Enter' && !e.shiftKey) {
                input.blur();
            }
        });
    }

    // Setup canvas events
    canvas.addEventListener('mousedown', handleStart);
    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('mouseup', handleEnd);
    canvas.addEventListener('mouseleave', handleEnd);
    canvas.addEventListener('touchstart', handleStart, { passive: false });
    canvas.addEventListener('touchmove', handleMove, { passive: false });
    canvas.addEventListener('touchend', handleEnd);

    // Setup toolbar events
    toolbar.querySelectorAll('.drawing-tool-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            toolbar.querySelectorAll('.drawing-tool-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentSettings.tool = btn.dataset.tool;
            canvas.style.cursor = DRAWING_TOOLS[currentSettings.tool]?.cursor || 'crosshair';
            onToolChange(currentSettings.tool);
        });
    });

    toolbar.querySelector('.drawing-color-picker').addEventListener('input', (e) => {
        currentSettings.color = e.target.value;
    });

    toolbar.querySelector('.drawing-size-slider').addEventListener('input', (e) => {
        currentSettings.size = parseInt(e.target.value);
    });

    // Append to container
    container.style.position = 'relative';
    container.appendChild(canvas);
    container.appendChild(toolbar);

    return {
        canvas,
        toolbar,
        getSettings() {
            return { ...currentSettings };
        },
        setSettings(settings) {
            currentSettings = { ...currentSettings, ...settings };
        },
        setTool(tool) {
            if (DRAWING_TOOLS[tool]) {
                currentSettings.tool = tool;
                toolbar.querySelectorAll('.drawing-tool-btn').forEach(b => {
                    b.classList.toggle('active', b.dataset.tool === tool);
                });
                canvas.style.cursor = DRAWING_TOOLS[tool].cursor;
            }
        },
        undo() {
            if (undoStack.length > 0) {
                redoStack.push(JSON.stringify(shapes));
                shapes = JSON.parse(undoStack.pop());
                redrawAll();
                onChange(shapes);
            }
        },
        redo() {
            if (redoStack.length > 0) {
                undoStack.push(JSON.stringify(shapes));
                shapes = JSON.parse(redoStack.pop());
                redrawAll();
                onChange(shapes);
            }
        },
        clear() {
            saveState();
            shapes = [];
            redrawAll();
            onChange(shapes);
        },
        getShapes() {
            return [...shapes];
        },
        setShapes(newShapes) {
            shapes = [...newShapes];
            redrawAll();
        },
        resize(newWidth, newHeight) {
            canvas.width = newWidth;
            canvas.height = newHeight;
            tempCanvas.width = newWidth;
            tempCanvas.height = newHeight;
            redrawAll();
        },
        toDataURL(type = 'image/png', quality = 1) {
            return canvas.toDataURL(type, quality);
        },
        mergeOnto(targetCanvas) {
            const targetCtx = targetCanvas.getContext('2d');
            targetCtx.drawImage(canvas, 0, 0, targetCanvas.width, targetCanvas.height);
        },
        destroy() {
            canvas.remove();
            toolbar.remove();
            style.remove();
        }
    };
}
