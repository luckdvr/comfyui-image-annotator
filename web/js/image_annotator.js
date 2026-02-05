import { app } from "../../../scripts/app.js";
import { api } from "../../../scripts/api.js";

console.log("Image Annotator Ultimate Pro loading...");

// ============ Utility Functions ============
function chainCallback(object, property, callback) {
    if (object == undefined) return;
    if (property in object) {
        const callback_orig = object[property]
        object[property] = function () {
            const r = callback_orig.apply(this, arguments);
            callback.apply(this, arguments);
            return r
        };
    } else { object[property] = callback; }
}

function hexToRgba(hex, alpha) {
    if (!hex || typeof hex !== 'string') return `rgba(34, 197, 94, ${alpha})`;
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const r = parseInt(h.slice(0, 2), 16) || 0, g = parseInt(h.slice(2, 4), 16) || 0, b = parseInt(h.slice(4, 6), 16) || 0;
    return `rgba(${r},${g},${b},${alpha})`;
}

const TOOLS = { MOVE: "move", ARROW: "arrow", PEN: "pen", RECT: "rect", LASSO: "lasso" };

const TOOL_NAMES = {
    arrow: "Select",
    move: "Hand",
    pen: "Point",
    rect: "Rectangle",
    lasso: "Lasso"
};

const COLORS = {
    bg: "#0d0f12", dark: "#13161a", panel: "#1a1d22", section: "#22262d",
    hover: "#2a2f38", border: "#2e333c", text: "#e4e8ed", dim: "#8b929c",
    accent: "#22c55e", danger: "#ef4444", info: "#3b82f6",
    semantic: { red: "#ef4444", green: "#22c55e", blue: "#3b82f6" }
};

const CSS = `
		    .ult-editor { display: flex; background: #15171b; border: 1px solid #2b313a; border-radius: 6px; overflow: hidden; width: 100%; height: 100%; color: #d5d9df; font-family: 'JetBrains Mono', 'Consolas', monospace; position: relative; user-select: none; }
	    .ult-editor.ult-resizing-v, .ult-editor.ult-resizing-v * { user-select: none !important; cursor: row-resize !important; }
	    .ult-editor.ult-resizing-h, .ult-editor.ult-resizing-h * { user-select: none !important; cursor: col-resize !important; }
		    .ult-sidebar { width: 300px; min-width: 260px; max-width: 500px; background: #191c21; border-right: 1px solid #2e343d; display: flex; flex-direction: column; flex-shrink: 0; position: relative; overflow: hidden; }
	    .ult-resizer { position: absolute; right: -4px; top: 0; width: 10px; height: 100%; cursor: col-resize; z-index: 25; touch-action: none; }
	    .ult-resizer::after { content: ""; position: absolute; top: 0; bottom: 0; left: 3px; width: 4px; border-radius: 2px; background: transparent; transition: background 0.15s; }
	    .ult-resizer:hover::after { background: ${COLORS.accent}; }
	    .ult-header { padding: 14px 12px; border-bottom: 1px solid #2a3038; border-top: 4px solid #1f9cff; background: #14171c; }
	    .ult-header h1 { font-size: 14px; color: #d9dde3; margin: 0; font-weight: 600; }
	    .ult-header-info { margin-top: 4px; font-size: 10px; color: ${COLORS.dim}; display: flex; gap: 12px; }
    
	    .ult-section { border-bottom: 1px solid ${COLORS.border}; display: flex; flex-direction: column; overflow: hidden; min-width: 0; min-height: 0; position: relative; border-top: 5px solid #5f6673; }
	    .ult-section[data-sect="tool"] { border-top-color: #ff9f43; }
	    .ult-section[data-sect="style"] { border-top-color: #34d5eb; }
	    .ult-section[data-sect="layers"] { border-top-color: #b9c000; }
	    .ult-section.collapsed { flex: 0 0 auto !important; border-top-color: #666d78 !important; }
	    .ult-section.collapsed .ult-section-content { display: none; }
	    .ult-section-header { padding: 10px 12px 9px; background: #161a20; font-size: 11px; font-weight: 600; color: #b8bec8; text-transform: none; display: flex; justify-content: space-between; align-items: center; cursor: pointer; flex-shrink: 0; }
	    .ult-sect-title { display: inline-flex; align-items: center; gap: 8px; }
	    /* Vertical splitter: keep a larger hit area for easier dragging in ComfyUI */
	    .ult-resizer-v { height: 10px; background: transparent; cursor: row-resize; z-index: 20; flex-shrink: 0; margin-top: -4px; margin-bottom: -4px; touch-action: none; }
	    .ult-resizer-v::after { content: ""; display: block; height: 4px; margin: 3px 0; border-radius: 2px; background: transparent; transition: background 0.15s; }
	    .ult-resizer-v:hover::after { background: ${COLORS.accent}; }
	    .ult-section-content { padding: 10px 12px; display: flex; flex-direction: column; gap: 8px; overflow-y: auto; overflow-x: hidden; flex: 1; min-width: 0; box-sizing: border-box; scrollbar-width: none; }
	    .ult-section-content::-webkit-scrollbar { width: 0; height: 0; }
	    .ult-tool-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px; margin-bottom: 6px; min-width: 0; }
    
	    .ult-tool-btn { aspect-ratio: 1; border: 1px solid #3b4350; border-radius: 6px; background: #222831; color: #c9d0dc; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 18px; transition: all 0.15s; min-width: 0; }
	    .ult-tool-btn:hover { background: #2a313b; border-color: #7e8797; }
	    .ult-tool-btn.active { background: #273447; color: #88c4ff; border-color: #66b4ff; box-shadow: inset 0 0 0 1px #66b4ff; }
	    .ult-tool-icon { width: 26px; height: 26px; display: inline-flex; align-items: center; justify-content: center; }
	    .ult-tool-icon svg { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 1.35; stroke-linecap: round; stroke-linejoin: round; }
    
    .ult-action-row { display: flex; gap: 6px; }
	    .ult-action-btn { flex: 1; height: 28px; border: 1px solid #3b4350; border-radius: 4px; background: #222831; color: #b8c0cb; font-size: 11px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; transition: all 0.2s; }
    .ult-action-btn:hover { background: ${COLORS.hover}; color: ${COLORS.text}; }
    .ult-action-btn:disabled { opacity: 0.3; cursor: not-allowed; pointer-events: none; }
    .ult-action-btn.danger:hover { background: ${COLORS.danger}; color: #fff; border-color: ${COLORS.danger}; }
    
	    .ult-style-row { display: flex; align-items: center; gap: 8px; font-size: 12px; min-width: 0; }
	    .ult-style-row.param { display: grid; grid-template-columns: 64px minmax(0, 1fr) 56px; align-items: center; column-gap: 8px; }
	    .ult-label { width: 52px; color: ${COLORS.dim}; white-space: nowrap; line-height: 1.2; }
	    .ult-style-row.param .ult-label { width: auto; }
	    .ult-style-row.param .ult-slider { width: 100%; }
	    .ult-style-row.param .ult-num-input { justify-self: end; }
	    .ult-num-input.readonly { width: 42px; cursor: default; background: #171d26; border-color: #2e343d; pointer-events: none; }

    /* AI Style Color Pickers */
	    .ult-ai-box-stack { position: relative; width: 40px; height: 40px; margin-right: 6px; flex-shrink: 0; }
	    .ult-ai-box { position: absolute; width: 30px; height: 30px; border: 2px solid #fff; border-radius: 4px; cursor: pointer; box-shadow: 0 0 4px rgba(0,0,0,0.5); transition: transform 0.1s; }
	    .ult-ai-box.fill { top: 0; left: 0; z-index: 2; }
	    .ult-ai-box.stroke { bottom: 0; right: 0; z-index: 1; }
	    .ult-ai-box.active { border-color: ${COLORS.accent}; z-index: 3; transform: scale(1.05); }
	    .ult-color-picker-hidden { width: 0; height: 0; visibility: hidden; position: absolute; }
    
	    .ult-quick-colors { display: flex; flex-wrap: wrap; gap: 4px; flex: 1; min-width: 0; }
	    .ult-q-color { width: 14px; height: 14px; border-radius: 3px; cursor: pointer; border: 1px solid rgba(255,255,255,0.15); }
    .ult-q-color:hover { transform: scale(1.15); border-color: #fff; }
    
		    .ult-slider { flex: 1; min-width: 0; -webkit-appearance: none; height: 6px; background: #293142; border-radius: 3px; }
	    .ult-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: #2ccf6f; border: 2px solid #122016; cursor: ew-resize; }
			    .ult-num-input { width: 56px; height: 24px; background: #1f2530; border: 1px solid #39414d; border-radius: 6px; color: #2ed773; font-family: 'JetBrains Mono', monospace; font-size: 11px; text-align: center; outline: none; flex-shrink: 0; }
	    .ult-num-input:focus { border-color: #66b4ff; }
    
    .ult-checkbox-row { display: flex; gap: 12px; margin-top: 4px; }
	    .ult-checkbox { display: flex; align-items: center; gap: 4px; font-size: 11px; color: ${COLORS.dim}; cursor: pointer; }
	    .ult-list-wrapper { flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
	    .ult-list { flex: 1; min-height: 0; overflow-y: auto !important; overflow-x: hidden; padding: 4px; min-width: 0; -webkit-overflow-scrolling: touch; overscroll-behavior: contain; touch-action: pan-y; }
	    .ult-list::-webkit-scrollbar { width: 6px; }
	    .ult-list::-webkit-scrollbar-track { background: transparent; }
	    .ult-list::-webkit-scrollbar-thumb { background: #3a4150; border-radius: 3px; }
	    .ult-list::-webkit-scrollbar-thumb:hover { background: #4a5260; }
	    .ult-item { display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 4px; background: ${COLORS.section}; border: 1px solid transparent; margin-bottom: 2px; cursor: pointer; min-width: 0; box-sizing: border-box; }
	    .ult-item.selected { background: rgba(34, 197, 94, 0.1); border-color: ${COLORS.accent}; }
	    .ult-vis { width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; opacity: 0.85; border-radius: 4px; background: rgba(255,255,255,0.03); }
	    .ult-vis svg { width: 14px; height: 14px; stroke: #c9ced7; fill: none; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
	    .ult-item.hidden .ult-vis { opacity: 0.45; }
	    .ult-item.hidden .ult-vis svg { stroke: #88919f; }
	    .ult-item-tag { flex: 1; min-width: 0; background: transparent; border: none; color: inherit; font-size: 12px; outline: none; }
    .ult-mark-del { opacity: 0.3; transition: opacity 0.2s; padding: 4px; font-size: 14px; }
    .ult-item:hover .ult-mark-del { opacity: 0.7; }
    .ult-mark-del:hover { opacity: 1 !important; color: ${COLORS.danger}; }
    
    .ult-main { flex: 1; display: flex; flex-direction: column; background: #1e1e1e; position: relative; }
		    .ult-status { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 6px 12px; background: #171b22; border-bottom: 1px solid #2e343d; font-size: 11px; white-space: nowrap; overflow: hidden; }
	    .ult-view { flex: 1; position: relative; overflow: hidden; }
    .ult-canvas { width: 100%; height: 100%; display: block; image-rendering: -webkit-optimize-contrast; }
	    .ult-trash-all { cursor: pointer; opacity: 0.72; transition: all 0.2s; font-size: 20px; line-height: 1; }
	    .ult-trash-all:hover { opacity: 1; color: ${COLORS.danger}; transform: scale(1.1); }
	    .ult-list-actions { display: flex; gap: 8px; padding: 8px 12px 10px; border-top: 1px solid ${COLORS.border}; background: rgba(0,0,0,0.15); flex-shrink: 0; }
	    .ult-list-actions.hidden { display: none; }
	    .ult-list-btn { flex: 1; height: 30px; border: 1px solid ${COLORS.border}; border-radius: 8px; background: ${COLORS.section}; color: ${COLORS.dim}; font-size: 12px; cursor: pointer; transition: all 0.2s; }
	    .ult-list-btn:hover { background: ${COLORS.hover}; color: ${COLORS.text}; }
	    .ult-list-btn.danger:hover { background: ${COLORS.danger}; border-color: ${COLORS.danger}; color: #fff; }
`;

class UltimateEditor {
    constructor(node, container) {
        this.node = node; this.container = container;
        this.marks = []; this.undoStack = []; this.tool = TOOLS.PEN;
        this.style = { stroke: "#22c55e", fill: "#22c55e", width: 2, size: 12, alpha: 0.35, show_stroke: true, show_fill: true };
        this.scale = 1.0; this.pan = { x: 0, y: 0 };
        this.selectedIndices = new Set(); this.lastSelectedIdx = -1;
        this.layoutStorageKey = "ult_image_annotator_layout_v1";
        this._globalListeners = []; // Track global event listeners for cleanup
        this.initUI();
    }

    // Helper: Add global event listener with tracking for cleanup
    _addGlobalListener(target, event, handler, options) {
        target.addEventListener(event, handler, options);
        this._globalListeners.push({ target, event, handler, options });
    }

    // Helper: Unified localStorage operations
    _layoutStorage = {
        get: (key, defaultValue) => {
            try {
                const raw = localStorage.getItem(this.layoutStorageKey);
                if (!raw) return defaultValue;
                const parsed = JSON.parse(raw);
                return parsed?.[key] ?? defaultValue;
            } catch {
                return defaultValue;
            }
        },

        set: (key, value) => {
            try {
                const raw = localStorage.getItem(this.layoutStorageKey);
                const parsed = raw ? JSON.parse(raw) : {};
                parsed[key] = value;
                parsed.v = 1;
                localStorage.setItem(this.layoutStorageKey, JSON.stringify(parsed));
            } catch {}
        },

        getMultiple: (keys) => {
            try {
                const raw = localStorage.getItem(this.layoutStorageKey);
                if (!raw) return {};
                const parsed = JSON.parse(raw);
                const result = {};
                keys.forEach(k => { result[k] = parsed?.[k]; });
                return result;
            } catch {
                return {};
            }
        }
    };

    initUI() {
        if (!document.getElementById("ult-editor-css")) {
            const s = document.createElement("style"); s.id = "ult-editor-css"; s.innerHTML = CSS; document.head.appendChild(s);
        }
        this.container.className = "ult-editor";
        this.container.innerHTML = `
	            <aside class="ult-sidebar" id="ult-side">
	                <div class="ult-resizer" id="ult-resize"></div>
	                <header class="ult-header">
	                    <h1>Annotation Control Center</h1>
	                    <div class="ult-header-info"><span>Count: <b id="ult-count">0</b></span></div>
	                </header>
	                <section class="ult-section" data-sect="tool" style="flex: 0 0 120px">
                    <div class="ult-section-header"><span class="ult-sect-title">Tools</span></div>
	                    <div class="ult-section-content">
		                        <div class="ult-tool-grid">
				                            <button class="ult-tool-btn" data-tool="arrow" title="Select / Move (V)"><span class="ult-tool-icon">↖️</span></button>
				                            <button class="ult-tool-btn" data-tool="move" title="Hand (H)"><span class="ult-tool-icon">✋</span></button>
				                            <button class="ult-tool-btn" data-tool="pen" title="Point (P)"><span class="ult-tool-icon">⦿</span></button>
				                            <button class="ult-tool-btn" data-tool="rect" title="Rectangle (M / R)"><span class="ult-tool-icon">▢</span></button>
				                            <button class="ult-tool-btn" data-tool="lasso" title="Polygon Lasso (L)"><span class="ult-tool-icon">⬡</span></button>
	                        </div>
	                        <div class="ult-action-row">
		                            <button class="ult-action-btn" id="ult-undo" title="Undo (Ctrl/Cmd+Z)">⬅️ Undo</button>
	                        </div>
	                    </div>
	                </section>
	                <div class="ult-resizer-v" data-prev="tool"></div>
	                <section class="ult-section" data-sect="style" style="flex: 0 0 240px">
                    <div class="ult-section-header"><span class="ult-sect-title">Appearance / Properties</span></div>
	                    <div class="ult-section-content">
	                        <div class="ult-style-row" style="align-items: flex-start">
		                            <div class="ult-ai-box-stack" id="ult-ai-colors">
		                                <div class="ult-ai-box fill active" title="Fill color" style="background:#22c55e"></div>
		                                <div class="ult-ai-box stroke" title="Stroke color" style="border-color:#22c55e"></div>
		                                <input type="color" class="ult-color-picker-hidden" id="ult-pick-color">
		                            </div>
                            <div class="ult-quick-colors">
                                <div class="ult-q-color" data-val="${COLORS.semantic.red}" style="background:${COLORS.semantic.red}"></div>
                                <div class="ult-q-color" data-val="${COLORS.semantic.green}" style="background:${COLORS.semantic.green}"></div>
                                <div class="ult-q-color" data-val="${COLORS.semantic.blue}" style="background:${COLORS.semantic.blue}"></div>
                                <div class="ult-q-color" data-val="#ffffff" style="background:#ffffff"></div>
                                <div class="ult-q-color" data-val="#000000" style="background:#000000"></div>
                                <div class="ult-q-color" data-val="#eab308" style="background:#eab308" title="Yellow"></div>
                                <div class="ult-q-color" data-val="#d946ef" style="background:#d946ef" title="Magenta"></div>
                                <div class="ult-q-color" data-val="#06b6d4" style="background:#06b6d4" title="Cyan"></div>
                            </div>
	                        </div>
	                        <div class="ult-style-row param">
	                            <span class="ult-label">Stroke</span>
	                            <input type="range" class="ult-slider" id="ult-s-width" min="0" max="20" value="2">
	                            <input type="text" class="ult-num-input readonly" id="ult-n-width" value="2" readonly>
	                        </div>
	                        <div class="ult-style-row param">
	                            <span class="ult-label">Size</span>
	                            <input type="range" class="ult-slider" id="ult-s-size" min="1" max="100" value="12">
	                            <input type="text" class="ult-num-input readonly" id="ult-n-size" value="12" readonly>
	                        </div>
	                        <div class="ult-style-row param">
	                            <span class="ult-label">Fill Op.</span>
	                            <input type="range" class="ult-slider" id="ult-s-alpha" min="0" max="100" value="35">
	                            <input type="text" class="ult-num-input readonly" id="ult-n-alpha" value="35" readonly>
	                        </div>
	                        <div class="ult-checkbox-row">
	                            <label class="ult-checkbox"><input type="checkbox" id="ult-chk-stroke" checked> Stroke</label>
	                            <label class="ult-checkbox"><input type="checkbox" id="ult-chk-fill" checked> Fill</label>
	                        </div>
	                    </div>
	                </section>
	                <div class="ult-resizer-v" data-prev="style"></div>
	                <section class="ult-section" style="flex: 1" data-sect="layers">
	                    <div class="ult-section-header"><span class="ult-sect-title">Annotations</span><span class="ult-trash-all" id="ult-clear-all" title="Clear all annotations">⟲</span></div>
	                    <div class="ult-section-content" style="padding: 0;">
	                        <div class="ult-list-wrapper">
	                            <div class="ult-list" id="ult-list"></div>
	                            <div class="ult-list-actions hidden" id="ult-list-actions">
	                                <button class="ult-list-btn danger" id="ult-del-selected">Delete Selected</button>
	                            </div>
	                        </div>
	                    </div>
	                </section>
	            </aside>
	            <main class="ult-main">
			                <div class="ult-status"><div>Tool: <b style="color:${COLORS.accent}" id="ult-st-tool">-</b> | Zoom: <b style="color:${COLORS.info}" id="ult-st-zoom">100%</b></div><b id="ult-st-pos">-, -</b></div>
	                <div class="ult-view"><canvas class="ult-canvas"></canvas></div>
	            </main>
        `;

        this.canvas = this.container.querySelector(".ult-canvas"); this.ctx = this.canvas.getContext("2d");
        this.view = this.container.querySelector(".ult-view"); this.listEl = this.container.querySelector("#ult-list");
        this.sidebar = this.container.querySelector("#ult-side");
        this.resizer = this.container.querySelector("#ult-resize");

        // Cache frequently used DOM elements
        this.elements = {
            stTool: this.container.querySelector("#ult-st-tool"),
            stZoom: this.container.querySelector("#ult-st-zoom"),
            stPos: this.container.querySelector("#ult-st-pos"),
            count: this.container.querySelector("#ult-count"),
            listActions: this.container.querySelector("#ult-list-actions"),
            delSelected: this.container.querySelector("#ult-del-selected")
        };

        const q = (s) => this.container.querySelector(s);
        const qa = (s) => this.container.querySelectorAll(s);
        const clamp = (min, v, max) => Math.max(min, Math.min(v, max));

        if (this.listEl) {
            this.listEl.addEventListener("wheel", (e) => {
                e.stopPropagation();
                if (this.listEl.scrollHeight > this.listEl.clientHeight) {
                    this.listEl.scrollTop += e.deltaY;
                    e.preventDefault();
                }
            }, { passive: false });
        }

        // --- Layout persistence (sidebar section heights only) ---
        const applySavedSectionHeights = () => {
            const { tool_h_px, style_h_px } = this._layoutStorage.getMultiple(['tool_h_px', 'style_h_px']);
            if (typeof tool_h_px === "number") {
                const sect = q(`section[data-sect="tool"]`);
                if (sect) sect.style.flex = `0 0 ${Math.max(60, Math.round(tool_h_px))}px`;
            }
            if (typeof style_h_px === "number") {
                const sect = q(`section[data-sect="style"]`);
                if (sect) sect.style.flex = `0 0 ${Math.max(80, Math.round(style_h_px))}px`;
            }
        };
        const applySavedSidebarWidth = () => {
            const sideW = this._layoutStorage.get('side_w_px');
            if (typeof sideW === "number") this.sidebar.style.width = `${Math.round(sideW)}px`;
        };
        const persistSectionHeights = () => {
            const toolSect = q(`section[data-sect="tool"]`);
            const styleSect = q(`section[data-sect="style"]`);
            if (!toolSect || !styleSect) return;
            this._layoutStorage.set('tool_h_px', Math.round(toolSect.getBoundingClientRect().height));
            this._layoutStorage.set('style_h_px', Math.round(styleSect.getBoundingClientRect().height));
        };
        const persistSidebarWidth = () => {
            this._layoutStorage.set('side_w_px', Math.round(this.sidebar.getBoundingClientRect().width));
        };
        const getSectionMins = () => {
            const getHeaderHeight = (sect) => {
                const h = sect?.querySelector(".ult-section-header");
                const r = h?.getBoundingClientRect?.();
                return Math.max(28, Math.round(r?.height || 0));
            };
            const toolSect = q(`section[data-sect="tool"]`);
            const styleSect = q(`section[data-sect="style"]`);
            const layersSect = q(`section[data-sect="layers"]`);
            if (!toolSect || !styleSect || !layersSect) return null;
            return {
                tool: toolSect.classList.contains("collapsed") ? getHeaderHeight(toolSect) : 90,
                style: styleSect.classList.contains("collapsed") ? getHeaderHeight(styleSect) : 140,
                layers: layersSect.classList.contains("collapsed") ? getHeaderHeight(layersSect) : 64,
                toolSect, styleSect, layersSect,
            };
        };
        const rebalanceSectionHeights = () => {
            const mins = getSectionMins();
            if (!mins) return;
            const { tool, style, layers, toolSect, styleSect, layersSect } = mins;
            const sidebarRect = this.sidebar.getBoundingClientRect();
            const headerEl = this.sidebar.querySelector(".ult-header");
            const headerH = headerEl ? Math.round(headerEl.getBoundingClientRect().height) : 0;
            const resizerTotalH = [...this.sidebar.querySelectorAll(".ult-resizer-v")]
                .reduce((sum, el) => sum + Math.round(el.getBoundingClientRect().height), 0);
            const available = Math.max(0, Math.floor(sidebarRect.height - headerH - resizerTotalH));
            if (available <= 0) return;

            const desiredSectionHeight = (sect, fallbackMin) => {
                if (sect.classList.contains("collapsed")) return fallbackMin;
                const head = sect.querySelector(".ult-section-header");
                const body = sect.querySelector(".ult-section-content");
                const headH = Math.round(head?.getBoundingClientRect?.().height || 30);
                const bodyNeed = Math.round(body?.scrollHeight || 0);
                return Math.max(fallbackMin, headH + bodyNeed + 2);
            };

            let toolH = desiredSectionHeight(toolSect, tool);
            let styleH = desiredSectionHeight(styleSect, style);
            toolH = clamp(tool, toolH, Math.max(tool, available - style - layers));
            styleH = clamp(style, styleH, Math.max(style, available - toolH - layers));
            let layersH = available - toolH - styleH;
            if (layersH < layers) {
                let deficit = layers - layersH;
                const styleSlack = Math.max(0, styleH - style);
                const styleCut = Math.min(styleSlack, deficit);
                styleH -= styleCut;
                deficit -= styleCut;
                const toolSlack = Math.max(0, toolH - tool);
                const toolCut = Math.min(toolSlack, deficit);
                toolH -= toolCut;
                layersH = available - toolH - styleH;
            }
            toolSect.style.flex = `0 0 ${Math.round(toolH)}px`;
            styleSect.style.flex = `0 0 ${Math.round(styleH)}px`;
            if (!layersSect.classList.contains("collapsed")) layersSect.style.flex = "1 1 auto";
        };
        const getSidebarBounds = () => {
            const min = 200;
            const hardMax = 520;
            const mainMin = 320;
            const cW = Math.round(this.container.getBoundingClientRect().width || 0);
            const dynamicMax = cW > 0 ? cW - mainMin : hardMax;
            return { min, max: Math.max(min, Math.min(hardMax, dynamicMax)) };
        };
        const clampSidebarWidth = (nextWidth) => {
            const { min, max } = getSidebarBounds();
            const width = clamp(min, Math.round(nextWidth), max);
            this.sidebar.style.width = `${width}px`;
            return width;
        };
        applySavedSectionHeights();
        applySavedSidebarWidth();
        clampSidebarWidth(this.sidebar.getBoundingClientRect().width || 260);
        rebalanceSectionHeights();

        // --- Collapsible panel logic ---
        qa(".ult-section-header").forEach(h => h.onclick = () => {
            h.parentElement.classList.toggle("collapsed");
            rebalanceSectionHeights();
            persistSectionHeights();
            this.render();
        });

        // --- Style property bindings (Slider + Read-only Number Display) ---
        const bindPair = (rangeId, numId, key, isAlpha = false) => {
            const r = q(rangeId), n = q(numId);
            const min = Number(r.min ?? 0);
            const max = Number(r.max ?? 100);

            r.oninput = (e) => {
                const val = Number(e.target.value);
                n.value = String(val);
                this.updateStyle(key, isAlpha ? (val / 100) : val);
            };
        };
        bindPair("#ult-s-width", "#ult-n-width", "width");
        bindPair("#ult-s-size", "#ult-n-size", "size");
        bindPair("#ult-s-alpha", "#ult-n-alpha", "alpha", true);

        q("#ult-chk-stroke").onclick = (e) => this.updateStyle('show_stroke', e.target.checked);
        q("#ult-chk-fill").onclick = (e) => this.updateStyle('show_fill', e.target.checked);

        // --- AI-style color picker logic ---
        const colorInput = q("#ult-pick-color");
        const fillBox = q(".ult-ai-box.fill");
        const strokeBox = q(".ult-ai-box.stroke");
        let activeColorType = "fill"; // "fill" or "stroke"

        const setActiveBox = (type) => {
            activeColorType = type;
            fillBox.classList.toggle("active", type === "fill");
            strokeBox.classList.toggle("active", type === "stroke");
        };
        const applyColor = (type, hex) => {
            if (type === "fill") {
                fillBox.style.background = hex;
                this.updateStyle("fill", hex);
            } else {
                strokeBox.style.borderColor = hex;
                this.updateStyle("stroke", hex);
            }
        };

        fillBox.onclick = () => { if (activeColorType === "fill") colorInput.click(); else setActiveBox("fill"); };
        strokeBox.onclick = () => { if (activeColorType === "stroke") colorInput.click(); else setActiveBox("stroke"); };

        colorInput.oninput = (e) => applyColor(activeColorType, e.target.value);

        qa(".ult-q-color").forEach(qc => qc.onclick = () => applyColor(activeColorType, qc.dataset.val));

        // --- Other tool buttons ---
        qa(".ult-tool-btn[data-tool]").forEach(b => b.onclick = () => this.setTool(b.dataset.tool));
        q("#ult-undo").onclick = () => this.undo();
        q("#ult-clear-all").onclick = (e) => { e.stopPropagation(); this.clearAll(); };
        q("#ult-del-selected").onclick = () => this.deleteSelected();

        // --- Vertical resize logic (Pointer Events + capture to prevent ComfyUI interference) ---
        this._vResize = null; // { prevKey, prevSect, startY, startH, pointerId }
        qa(".ult-resizer-v").forEach(rv => rv.addEventListener("pointerdown", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const prevKey = rv.dataset.prev;
            const prevSect = q(`section[data-sect="${prevKey}"]`);
            if (!prevSect) return;
            try { rv.setPointerCapture(e.pointerId); } catch { }
            this._vResize = {
                prevKey,
                prevSect,
                startY: e.clientY,
                startH: Math.round(prevSect.getBoundingClientRect().height),
                pointerId: e.pointerId,
            };
            this.container.classList.add("ult-resizing-v");
        }));

        const onVPointerMove = (e) => {
            if (!this._vResize) return;
            if (e.pointerId !== this._vResize.pointerId) return;
            e.preventDefault();
            e.stopPropagation();

            const { prevKey, prevSect, startY, startH } = this._vResize;

            const sidebarRect = this.sidebar.getBoundingClientRect();
            const headerEl = this.sidebar.querySelector(".ult-header");
            const headerH = headerEl ? Math.round(headerEl.getBoundingClientRect().height) : 0;
            const resizerTotalH = [...this.sidebar.querySelectorAll(".ult-resizer-v")]
                .reduce((sum, el) => sum + Math.round(el.getBoundingClientRect().height), 0);

            const mins = getSectionMins();
            if (!mins) return;
            const { tool: toolMin, style: styleMin, layers: layersMin } = mins;

            const minForPrev = prevKey === "tool" ? toolMin : styleMin;
            const maxForPrev = Math.max(
                minForPrev,
                Math.floor(sidebarRect.height - headerH - resizerTotalH - (prevKey === "tool" ? (styleMin + layersMin) : (toolMin + layersMin)))
            );

            const dy = e.clientY - startY;
            const nextH = clamp(minForPrev, startH + dy, maxForPrev);
            prevSect.style.flex = `0 0 ${Math.round(nextH)}px`;
            rebalanceSectionHeights();
            this.render();
        };

        const onVPointerUp = (e) => {
            if (!this._vResize) return;
            if (e.pointerId !== this._vResize.pointerId) return;
            e.preventDefault();
            e.stopPropagation();
            this._vResize = null;
            this.container.classList.remove("ult-resizing-v");
            persistSectionHeights();
        };

        this._addGlobalListener(window, "pointermove", onVPointerMove, { capture: true });
        this._addGlobalListener(window, "pointerup", onVPointerUp, { capture: true });
        this._addGlobalListener(window, "pointercancel", onVPointerUp, { capture: true });

        this._hResize = null; // { pointerId, startX, startWidth }
        this.resizer.addEventListener("pointerdown", (e) => {
            e.preventDefault();
            e.stopPropagation();
            try { this.resizer.setPointerCapture(e.pointerId); } catch { }
            this._hResize = {
                pointerId: e.pointerId,
                startX: e.clientX,
                startWidth: Math.round(this.sidebar.getBoundingClientRect().width),
            };
            this.container.classList.add("ult-resizing-h");
        });
        const onHPointerMove = (e) => {
            if (!this._hResize) return;
            if (e.pointerId !== this._hResize.pointerId) return;
            e.preventDefault();
            e.stopPropagation();
            const next = this._hResize.startWidth + (e.clientX - this._hResize.startX);
            clampSidebarWidth(next);
            this.render();
        };
        const onHPointerUp = (e) => {
            if (!this._hResize) return;
            if (e.pointerId !== this._hResize.pointerId) return;
            e.preventDefault();
            e.stopPropagation();
            this._hResize = null;
            this.container.classList.remove("ult-resizing-h");
            persistSidebarWidth();
        };
        this._addGlobalListener(window, "pointermove", onHPointerMove, { capture: true });
        this._addGlobalListener(window, "pointerup", onHPointerUp, { capture: true });
        this._addGlobalListener(window, "pointercancel", onHPointerUp, { capture: true });

        this.view.onmousedown = (e) => this.onMouseDown(e);
        this.view.ondblclick = (e) => this.onDoubleClick(e);
        this.keyboardScopeActive = false;
        this.container.addEventListener("pointerenter", () => { this.keyboardScopeActive = true; });
        this.container.addEventListener("pointerleave", () => { this.keyboardScopeActive = false; this.spaceDown = false; this.updateCursor(); });
        this.container.addEventListener("pointerdown", () => { this.keyboardScopeActive = true; });
        this._addGlobalListener(window, "contextmenu", (e) => {
            if (this.isDrawing && this.tool === TOOLS.LASSO) {
                e.preventDefault();
                this.finishPolygon();
            }
        });
        this._addGlobalListener(window, "mousemove", (e) => this.onMouseMove(e));
        this._addGlobalListener(window, "mouseup", () => this.onMouseUp());
        this.view.onwheel = (e) => this.onWheel(e);

        this._addGlobalListener(window, "keydown", (e) => {
            if (e.target.tagName === "INPUT") return;
            if (!this.node.selected) return;
            if (!this.keyboardScopeActive) return;
            if (e.code === "Space") { e.preventDefault(); this.spaceDown = true; this.updateCursor(); return; }
            if (e.code === "KeyA" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); this.marks.forEach((_, i) => this.selectedIndices.add(i)); this.refresh(); return; }
            const k = e.key.toLowerCase();
            if (k === "v") this.setTool(TOOLS.ARROW);
            if (k === "h") this.setTool(TOOLS.MOVE);
            if (k === "p") this.setTool(TOOLS.PEN);
            if (k === "m" || k === "r") this.setTool(TOOLS.RECT);
            if (k === "l") this.setTool(TOOLS.LASSO);
            if (k === "z" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); this.undo(); return; }
            if (k === "delete" || k === "backspace") { e.preventDefault(); this.deleteSelected(); return; }
        });
        this._addGlobalListener(window, "keyup", (e) => { if (e.code === "Space") { this.spaceDown = false; this.updateCursor(); } });
        this.container.onmousedown = (e) => e.stopPropagation();
        this.container.onwheel = (e) => e.stopPropagation();

        chainCallback(this.node, "onResize", () => {
            clampSidebarWidth(this.sidebar.getBoundingClientRect().width || 260);
            rebalanceSectionHeights();
            this.render();
        });
        if (typeof ResizeObserver !== "undefined") {
            this._layoutObserver = new ResizeObserver(() => {
                clampSidebarWidth(this.sidebar.getBoundingClientRect().width || 260);
                rebalanceSectionHeights();
                this.render();
            });
            this._layoutObserver.observe(this.container);
        }
        this.setTool(TOOLS.PEN);
        this.updateUndoRedoButtons();
    }

    updateStyle(key, val) {
        this.style[key] = val;
        if (this.selectedIndices.size > 0) {
            this.selectedIndices.forEach(idx => {
                const m = this.marks[idx];
                if (!m.style) m.style = {};
                if (key === 'stroke') m.style.stroke_color = val;
                else if (key === 'fill') m.style.fill_color = val;
                else if (key === 'width') m.style.stroke_width = val;
                else if (key === 'size') m.style.point_size = val;
                else if (key === 'alpha') m.style.fill_alpha = val;
                else if (key === 'show_stroke') m.style.show_stroke = val;
                else if (key === 'show_fill') m.style.show_fill = val;
            });
            this.refresh();
        }
    }

    clearAll() { if (confirm("Clear all annotations?")) { this.saveUndo(); this.marks = []; this.selectedIndices.clear(); this.refresh(); } }

    setTool(t) {
        this.tool = t;
        this.container.querySelectorAll(".ult-tool-grid .ult-tool-btn").forEach(b => b.classList.toggle("active", b.dataset.tool === t));
        this.elements.stTool.innerText = TOOL_NAMES[t] || t;
        this.isDrawing = false;
        this.updateCursor();
        this.render();
    }
    updateCursor() { this.view.style.cursor = (this.spaceDown || this.tool === TOOLS.MOVE) ? "grab" : "crosshair"; }
    setImage(url) { if (!url) return; const img = new Image(); img.crossOrigin = "anonymous"; img.onload = () => { this.img = img; this.fitView(); }; img.src = url; }
    fitView() {
        if (!this.img) return;
        const v = this.view.getBoundingClientRect();
        if (v.width === 0) { setTimeout(() => this.fitView(), 100); return; }
        this.canvas.width = v.width; this.canvas.height = v.height;
        const r = this.img.width / this.img.height;
        let dw = v.width * 0.95, dh = v.height * 0.95;
        if (dw / dh > r) dw = dh * r; else dh = dw / r;
        this.scale = dw / this.img.width;
        this.pan.x = (v.width - dw) / 2;
        this.pan.y = (v.height - dh) / 2;
        this.refresh();
        this.updateZoomDisplay();
    }
    getCoord(e) {
        const r = this.canvas.getBoundingClientRect();
        let x = (e.clientX - r.left - this.pan.x) / this.scale;
        let y = (e.clientY - r.top - this.pan.y) / this.scale;
        if (this.img) {
            x = Math.max(0, Math.min(x, this.img.width));
            y = Math.max(0, Math.min(y, this.img.height));
        }
        return { x, y };
    }
    onWheel(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const oldScale = this.scale;
        this.scale = Math.min(Math.max(this.scale * delta, 0.1), 10);

        const pt = this.getCoord(e);
        this.pan.x -= (pt.x * (this.scale - oldScale));
        this.pan.y -= (pt.y * (this.scale - oldScale));

        this.updateZoomDisplay();
        this.render();
    }

    onMouseDown(e) {
        const pt = this.getCoord(e); this.lastMouse = { x: e.clientX, y: e.clientY };
        if (this.spaceDown || e.button === 1 || this.tool === TOOLS.MOVE) { this.isPanning = true; return; }

        if (this.tool === TOOLS.ARROW) {
            const hit = this.hitTest(pt);
            if (hit.idx >= 0) {
                this.saveUndo();
                this.select(hit.idx, e);
                this.isDragging = true;
                this.dragInfo = { idx: hit.idx, handleIdx: hit.handleIdx };
            } else if (!e.ctrlKey && !e.shiftKey && !e.metaKey) {
                this.selectedIndices.clear(); this.refresh();
                this.isPanning = true;
            } else {
                this.isPanning = true;
            }
        }
        else if (this.tool === TOOLS.PEN) { this.saveUndo(); this.addMark("point", [[pt.x, pt.y]]); }
        else if (this.tool === TOOLS.RECT) { this.isDrawing = true; this.tempPoints = [[pt.x, pt.y], [pt.x, pt.y]]; }
        else if (this.tool === TOOLS.LASSO) {
            if (!this.isDrawing) {
                this.saveUndo();
                this.isDrawing = true;
                this.tempPoints = [];
            }
            this.tempPoints.push([pt.x, pt.y]);
            this.render();
        }
        this.render();
    }


    onMouseMove(e) {
        const p = this.getCoord(e); this.elements.stPos.innerText = `${Math.round(p.x)}, ${Math.round(p.y)}`;
        if (this.isPanning) { this.pan.x += e.clientX - this.lastMouse.x; this.pan.y += e.clientY - this.lastMouse.y; this.lastMouse = { x: e.clientX, y: e.clientY }; this.render(); return; }
        if (this.isDragging && this.selectedIndices.size > 0) {
            const dx = (e.clientX - this.lastMouse.x) / this.scale;
            const dy = (e.clientY - this.lastMouse.y) / this.scale;
            this.selectedIndices.forEach(idx => {
                const m = this.marks[idx];
                if (this.dragInfo && this.dragInfo.handleIdx !== -1 && idx === this.dragInfo.idx) {
                    const np = m.points[this.dragInfo.handleIdx];
                    m.points[this.dragInfo.handleIdx] = [np[0] + dx, np[1] + dy];
                } else {
                    m.points = m.points.map(pt => [pt[0] + dx, pt[1] + dy]);
                }
                // Constrain points within image bounds
                if (this.img) {
                    m.points.forEach(pt => {
                        pt[0] = Math.max(0, Math.min(pt[0], this.img.width));
                        pt[1] = Math.max(0, Math.min(pt[1], this.img.height));
                    });
                }
            });
            this.lastMouse = { x: e.clientX, y: e.clientY }; this.render();
        } else if (this.isDrawing) {
            const pt = this.getCoord(e);
            if (this.tool === TOOLS.RECT) this.tempPoints[1] = [pt.x, pt.y];
            else if (this.tool === TOOLS.LASSO) {
                this.tempPointsCurrent = [pt.x, pt.y];
            }
            this.render();
        }
    }
    onMouseUp() {
        this.isPanning = false;
        if (this.isDragging) { this.isDragging = false; this.sync(); }
        if (this.isDrawing) {
            if (this.tool === TOOLS.RECT) {
                const [p1, p2] = this.tempPoints;
                const w = Math.abs(p2[0] - p1[0]);
                const h = Math.abs(p2[1] - p1[1]);
                // Only create rectangle if it has minimum size (5 pixels)
                if (w > 5 && h > 5) {
                    this.saveUndo();
                    this.addMark("rect", this.tempPoints);
                }
                this.isDrawing = false;
            } else if (this.tool === TOOLS.LASSO) {
                // For lasso, points are added on mousedown, not mouseup.
                // MouseUp only ends dragging or panning.
            }
        }
        this.render();
    }

    addMark(t, p) {
        const s = {
            stroke_color: this.style.stroke, stroke_width: this.style.width,
            fill_color: this.style.fill, fill_alpha: this.style.alpha,
            point_size: this.style.size || 12,
            show_stroke: this.style.show_stroke ?? true, show_fill: this.style.show_fill ?? true
        };
        this.marks.push({ label: `${this.marks.length + 1} `, type: t, points: JSON.parse(JSON.stringify(p)), style: s, visible: true });
        this.select(this.marks.length - 1);
        this.sync();
    }
    select(i, e = {}) {
        if (i < 0) { this.selectedIndices.clear(); }
        else if (e.ctrlKey || e.metaKey) {
            if (this.selectedIndices.has(i)) this.selectedIndices.delete(i);
            else this.selectedIndices.add(i);
        } else if (e.shiftKey && this.lastSelectedIdx >= 0) {
            const start = Math.min(i, this.lastSelectedIdx), end = Math.max(i, this.lastSelectedIdx);
            for (let k = start; k <= end; k++) this.selectedIndices.add(k);
        } else {
            this.selectedIndices.clear(); this.selectedIndices.add(i);
        }
        if (i >= 0) { this.lastSelectedIdx = i; this.syncUI(this.marks[i]); }
        this.updateList(); this.render();
    }
    // Helper: Update slider and number input pair
    _updateSliderPair(sliderId, inputId, value) {
        const slider = this.container.querySelector(sliderId);
        const input = this.container.querySelector(inputId);
        if (slider) slider.value = value;
        if (input) input.value = value;
    }

    syncUI(m) {
        const style = m.style || {};
        this.style = {
            stroke: style.stroke_color || "#22c55e",
            fill: style.fill_color || style.stroke_color || "#22c55e",
            width: style.stroke_width || 2,
            size: style.point_size || 12,
            alpha: style.fill_alpha ?? 0.35,
            show_stroke: style.show_stroke ?? true,
            show_fill: style.show_fill ?? true
        };

        const q = (s) => this.container.querySelector(s);

        // Update color boxes
        q(".ult-ai-box.fill").style.background = this.style.fill;
        q(".ult-ai-box.stroke").style.borderColor = this.style.stroke;

        // Update sliders and inputs
        this._updateSliderPair("#ult-s-width", "#ult-n-width", this.style.width);
        this._updateSliderPair("#ult-s-size", "#ult-n-size", this.style.size);
        this._updateSliderPair("#ult-s-alpha", "#ult-n-alpha", Math.round(this.style.alpha * 100));

        // Update checkboxes
        q("#ult-chk-stroke").checked = this.style.show_stroke;
        q("#ult-chk-fill").checked = this.style.show_fill;
    }
    deleteSelected() {
        if (this.selectedIndices.size > 0) {
            this.removeMarksByIndices(Array.from(this.selectedIndices));
        }
    }
    removeMarksByIndices(indices = []) {
        const valid = [...new Set(indices)]
            .filter(idx => Number.isInteger(idx) && idx >= 0 && idx < this.marks.length)
            .sort((a, b) => b - a);
        if (valid.length === 0) return;
        this.saveUndo();
        valid.forEach(idx => this.marks.splice(idx, 1));
        this.selectedIndices.clear();
        this.lastSelectedIdx = -1;
        this.refresh();
    }
    hitTest(pt) {
        const HANDLE_RADIUS = 12 / this.scale;
        for (let i = this.marks.length - 1; i >= 0; i--) {
            const m = this.marks[i]; if (!m.visible) continue;
            // Vertex detection first (Polygon Handle)
            if (m.type === "polygon" || m.type === "rect") {
                for (let pIdx = 0; pIdx < m.points.length; pIdx++) {
                    if (Math.hypot(pt.x - m.points[pIdx][0], pt.y - m.points[pIdx][1]) < HANDLE_RADIUS) {
                        return { idx: i, handleIdx: pIdx };
                    }
                }
            }
            // Overall collision detection
            if (m.type === "point") {
                const radius = (m.style.point_size || 12);
                if (Math.hypot(pt.x - m.points[0][0], pt.y - m.points[0][1]) < radius) return { idx: i, handleIdx: -1 };
            }
            else if (m.type === "rect") {
                const [p1, p2] = m.points;
                if (pt.x >= Math.min(p1[0], p2[0]) && pt.x <= Math.max(p1[0], p2[0]) && pt.y >= Math.min(p1[1], p2[1]) && pt.y <= Math.max(p1[1], p2[1])) return { idx: i, handleIdx: -1 };
            }
            else if (m.type === "polygon") {
                let inside = false;
                for (let p = 0, j = m.points.length - 1; p < m.points.length; j = p++) {
                    if (((m.points[p][1] > pt.y) !== (m.points[j][1] > pt.y)) && (pt.x < (m.points[j][0] - m.points[p][0]) * (pt.y - m.points[p][1]) / (m.points[j][1] - m.points[p][1]) + m.points[p][0])) inside = !inside;
                }
                if (inside) return { idx: i, handleIdx: -1 };
            }
        }
        return { idx: -1, handleIdx: -1 };
    }

    // Helper method: Draw mark outline (used by selection highlight and temp drawing)
    _drawMarkOutline(mark, radius, offset = 0) {
        this.ctx.beginPath();
        if (mark.type === "point") {
            this.ctx.arc(mark.points[0][0], mark.points[0][1], radius + offset / this.scale, 0, Math.PI * 2);
        } else if (mark.type === "rect") {
            const [p1, p2] = mark.points;
            const x = Math.min(p1[0], p2[0]), y = Math.min(p1[1], p2[1]);
            const w = Math.abs(p2[0] - p1[0]), h = Math.abs(p2[1] - p1[1]);
            this.ctx.rect(x - offset / this.scale, y - offset / this.scale, w + 2 * offset / this.scale, h + 2 * offset / this.scale);
        } else if (mark.type === "polygon") {
            this.ctx.moveTo(mark.points[0][0], mark.points[0][1]);
            mark.points.forEach(p => this.ctx.lineTo(p[0], p[1]));
            this.ctx.closePath();
        }
        this.ctx.stroke();
    }

    // Helper method: Draw selection highlight (marching ants effect)
    drawSelectionHighlight(mark, radius) {
        this.ctx.save();
        // Draw black outline first for visibility
        this.ctx.strokeStyle = "#000";
        this.ctx.lineWidth = 4 / this.scale;
        this.ctx.setLineDash([]);
        this._drawMarkOutline(mark, radius, 3);

        // Draw white dashed line on top
        this.ctx.strokeStyle = "#fff";
        this.ctx.lineWidth = 2 / this.scale;
        this.ctx.setLineDash([5 / this.scale, 5 / this.scale]);
        this._drawMarkOutline(mark, radius, 3);
        this.ctx.restore();
    }

    // Helper method: Draw temp shape outline
    _drawTempShapeOutline() {
        this.ctx.beginPath();
        if (this.tool === TOOLS.RECT) {
            this.ctx.rect(
                this.tempPoints[0][0],
                this.tempPoints[0][1],
                this.tempPoints[1][0] - this.tempPoints[0][0],
                this.tempPoints[1][1] - this.tempPoints[0][1]
            );
        } else if (this.tool === TOOLS.LASSO && this.tempPoints.length > 0) {
            this.ctx.moveTo(this.tempPoints[0][0], this.tempPoints[0][1]);
            this.tempPoints.forEach(p => this.ctx.lineTo(p[0], p[1]));
            if (this.tempPointsCurrent) {
                this.ctx.lineTo(this.tempPointsCurrent[0], this.tempPointsCurrent[1]);
            }
        }
        this.ctx.stroke();
    }

    // Helper method: Draw temporary shape being drawn
    drawTempShape() {
        if (!this.isDrawing) return;

        // Draw black outline first
        this.ctx.strokeStyle = "#000";
        this.ctx.lineWidth = 3 / this.scale;
        this.ctx.setLineDash([]);
        this._drawTempShapeOutline();

        // Draw white dashed line on top
        this.ctx.strokeStyle = "#fff";
        this.ctx.lineWidth = 1.5 / this.scale;
        this.ctx.setLineDash([5 / this.scale, 5 / this.scale]);
        this._drawTempShapeOutline();

        // Draw polygon vertices
        if (this.tool === TOOLS.LASSO && this.tempPoints.length > 0) {
            this.ctx.fillStyle = "#fff";
            this.tempPoints.forEach(p => {
                this.ctx.beginPath();
                this.ctx.arc(p[0], p[1], 3 / this.scale, 0, Math.PI * 2);
                this.ctx.fill();
            });
        }
    }

    render() {
        if (!this.img) return; const rect = this.view.getBoundingClientRect(); if (rect.width === 0) return;
        if (this.canvas.width !== rect.width || this.canvas.height !== rect.height) { this.canvas.width = rect.width; this.canvas.height = rect.height; }
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); this.ctx.save();
        this.ctx.translate(this.pan.x, this.pan.y); this.ctx.scale(this.scale, this.scale);
        this.ctx.drawImage(this.img, 0, 0);
        this.marks.forEach((m, idx) => {
            if (!m.visible) return;
            const isSel = this.selectedIndices.has(idx);
            const style = m.style || {};
            const showStroke = style.show_stroke ?? true;
            const showFill = style.show_fill ?? true;
            const strokeWidth = (style.stroke_width || 2);
            const radius = (style.point_size || 12);

            this.ctx.lineWidth = strokeWidth / this.scale;
            this.ctx.strokeStyle = style.stroke_color || COLORS.accent;
            this.ctx.fillStyle = hexToRgba(style.fill_color || style.stroke_color || COLORS.accent, style.fill_alpha ?? 0.35);

            let lx, ly; // Label position

            if (m.type === "point") {
                lx = m.points[0][0]; ly = m.points[0][1];
                this.ctx.beginPath(); this.ctx.arc(lx, ly, radius, 0, Math.PI * 2);
                if (showFill) this.ctx.fill();
                if (showStroke) this.ctx.stroke();
            } else if (m.type === "rect") {
                const [p1, p2] = m.points;
                const x = Math.min(p1[0], p2[0]), y = Math.min(p1[1], p2[1]);
                const w = Math.abs(p2[0] - p1[0]), h = Math.abs(p2[1] - p1[1]);
                lx = x + w / 2; ly = y + h / 2;
                if (showFill) this.ctx.fillRect(x, y, w, h);
                if (showStroke) this.ctx.strokeRect(x, y, w, h);
            } else if (m.type === "polygon") {
                this.ctx.beginPath(); this.ctx.moveTo(m.points[0][0], m.points[0][1]);
                m.points.forEach(p => this.ctx.lineTo(p[0], p[1])); this.ctx.closePath();
                if (showFill) this.ctx.fill();
                if (showStroke) this.ctx.stroke();
                let sx = 0, sy = 0; m.points.forEach(p => { sx += p[0]; sy += p[1]; });
                lx = sx / m.points.length; ly = sy / m.points.length;
            }

            // Draw index number (Refined Design)
            this.ctx.save();
            this.ctx.fillStyle = "#fff"; this.ctx.textAlign = "center"; this.ctx.textBaseline = "middle";
            this.ctx.shadowBlur = 4; this.ctx.shadowColor = "rgba(0,0,0,0.8)";
            if (m.type === "point") {
                const badgeR = Math.max(8, radius * 0.85);
                this.ctx.beginPath(); this.ctx.arc(lx, ly, badgeR, 0, Math.PI * 2);
                this.ctx.fillStyle = style.stroke_color || COLORS.accent;
                this.ctx.fill();
                this.ctx.strokeStyle = "#fff"; this.ctx.lineWidth = 1 / this.scale; this.ctx.stroke();
                this.ctx.fillStyle = "#fff"; this.ctx.font = `bold ${badgeR * 1.1}px sans-serif`;
                this.ctx.fillText(idx + 1, lx, ly);
            } else {
                // Rectangle and polygon show centered number only
                const fontSize = Math.max(10, radius * 1.2);
                this.ctx.font = `bold ${fontSize}px sans-serif`;
                this.ctx.fillText(idx + 1, lx, ly);
            }
            this.ctx.restore();

            // Selection highlight effect
            if (isSel) {
                this.drawSelectionHighlight(m, radius);
            }
        });
        if (this.isDrawing) {
            this.drawTempShape();
        }
        this.ctx.restore();
    }

    onDoubleClick() {
        if (this.isDrawing && this.tool === TOOLS.LASSO) {
            this.finishPolygon();
        }
    }

    finishPolygon() {
        if (this.tempPoints.length > 2) {
            this.addMark("polygon", this.tempPoints);
        }
        // Reset all drawing state
        this.isDrawing = false;
        this.tempPoints = [];
        this.tempPointsCurrent = null;

        // Force switch to arrow tool - this will also call render()
        this.setTool(TOOLS.ARROW);
    }
    updateList() {
        if (!this.listEl) return;
        this.listEl.innerHTML = "";
        this.elements.count.innerText = this.marks.length;
        const actionWrap = this.elements.listActions;
        const delSelectedBtn = this.elements.delSelected;
        const eyeIcon = (isVisible) => isVisible
            ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M1.5 12s3.8-6 10.5-6 10.5 6 10.5 6-3.8 6-10.5 6S1.5 12 1.5 12z"></path><circle cx="12" cy="12" r="3.2"></circle></svg>`
            : `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M1.5 12s3.8-6 10.5-6 10.5 6 10.5 6-3.8 6-10.5 6S1.5 12 1.5 12z"></path><path d="M4 20L20 4"></path></svg>`;
        if (actionWrap && delSelectedBtn) {
            const selectedCount = this.selectedIndices.size;
            const show = selectedCount > 1;
            actionWrap.classList.toggle("hidden", !show);
            delSelectedBtn.innerText = `Delete Selected (${selectedCount})`;
        }
        [...this.marks].reverse().forEach((m, revIdx) => {
            const i = this.marks.length - 1 - revIdx;
            const item = document.createElement("div"); item.className = `ult-item ${this.selectedIndices.has(i) ? 'selected' : ''} ${!m.visible ? 'hidden' : ''}`;
            item.innerHTML = `<div class="ult-vis">${eyeIcon(!!m.visible)}</div><div style="width:12px; height:12px; background:${m.style.stroke_color}; border-radius:3px; margin-right:8px; border:1px solid rgba(255,255,255,0.2)"></div><span style="font-size:10px; opacity:0.5; margin-right:4px">${i + 1}</span><input class="ult-item-tag" value="${m.label}"/><div class="ult-mark-del">🗑</div>`;
            item.querySelector(".ult-vis").onclick = (e) => { e.stopPropagation(); m.visible = !m.visible; this.refresh(); };
            item.querySelector(".ult-item-tag").onchange = (e) => { m.label = e.target.value; this.sync(); };
            item.querySelector(".ult-mark-del").onclick = (e) => {
                e.stopPropagation();
                if (this.selectedIndices.size > 1 && this.selectedIndices.has(i)) {
                    this.removeMarksByIndices(Array.from(this.selectedIndices));
                    return;
                }
                this.removeMarksByIndices([i]);
            };
            item.onclick = (e) => this.select(i, e);
            this.listEl.appendChild(item);
        });
    }
    saveUndo() {
        this.undoStack.push(JSON.stringify(this.marks));
        if (this.undoStack.length > 50) this.undoStack.shift();
        this.updateUndoRedoButtons();
    }
    updateUndoRedoButtons() {
        const undoBtn = this.container.querySelector("#ult-undo");
        if (undoBtn) undoBtn.disabled = (this.undoStack.length === 0);
    }
    undo() {
        if (this.undoStack.length === 0) return;
        this.marks = JSON.parse(this.undoStack.pop());
        this.selectedIndices.clear();
        this.lastSelectedIdx = -1;
        this.refresh();
    }
    refresh() { this.render(); this.updateList(); this.sync(); this.updateZoomDisplay(); this.updateUndoRedoButtons(); }
    updateZoomDisplay() {
        const z = Math.round(this.scale * 100);
        this.elements.stZoom.innerText = `${z}% `;
    }
    sync() {
        const widget = this.node.widgets.find(w => w.name === "mark_data");
        const data = { version: "1.0", marks: this.marks, image_size: [this.img?.width || 0, this.img?.height || 0] };
        if (widget) { widget.value = JSON.stringify(data); this.node.graph.set_dirty_canvas(true); }
    }
    loadData() { const w = this.node.widgets.find(w => w.name === "mark_data"); if (w && w.value) { try { this.marks = JSON.parse(w.value).marks || []; this.refresh(); } catch (e) { } } }

    // Cleanup method to prevent memory leaks
    destroy() {
        // Remove all global event listeners
        this._globalListeners.forEach(({ target, event, handler, options }) => {
            target.removeEventListener(event, handler, options);
        });
        this._globalListeners = [];

        // Disconnect ResizeObserver
        if (this._layoutObserver) {
            this._layoutObserver.disconnect();
            this._layoutObserver = null;
        }
    }
}

app.registerExtension({
    name: "Comfy.ImageAnnotatorUltimateV8.0",
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== "ImageAnnotator") return;
        chainCallback(nodeType.prototype, "onNodeCreated", function () {
            const c = document.createElement("div"); this.annotator = new UltimateEditor(this, c);
            const mw = this.widgets.find(w => w.name === "mark_data"); if (mw) { mw.type = "converted-widget"; mw.computeSize = () => [0, -4]; }
            this.addDOMWidget("ImageAnnotator", "editor", c, { serialize: false, hideOnZoom: false });
            this.setSize([950, 750]); setTimeout(() => { this.annotator.loadData(); this.annotator.setImage(this.getImgUrl()); }, 150);
        });
        nodeType.prototype.getImgUrl = function () {
            const l = this.inputs[0]?.link; if (!l) return null; const on = app.graph.getNodeById(app.graph.links[l].origin_id); if (!on) return null;
            if (on.imgs && on.imgs.length > 0) return on.imgs[0].src; const fn = on.widgets?.find(w => w.name === "image")?.value || on.widgets_values?.[0];
            return fn ? api.apiURL(`/view?filename=${encodeURIComponent(fn)}`) : null;
        };
        chainCallback(nodeType.prototype, "onConnectionsChange", function () { if (this.annotator) setTimeout(() => this.annotator.setImage(this.getImgUrl()), 250); });
        chainCallback(nodeType.prototype, "onRemoved", function () {
            if (this.annotator) {
                this.annotator.destroy();
                this.annotator = null;
            }
        });
    }
});
