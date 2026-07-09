import * as vscode from 'vscode';

function getNonce(): string {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

export function getWebviewHtml(webview: vscode.Webview): string {
	const nonce = getNonce();
	const csp = [
		`default-src 'none'`,
		`img-src ${webview.cspSource} data: blob:`,
		`style-src ${webview.cspSource} 'unsafe-inline'`,
		`script-src 'nonce-${nonce}'`,
	].join('; ');

	return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8" />
	<meta http-equiv="Content-Security-Policy" content="${csp}" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<title>Diagram</title>
	<style>
		* { box-sizing: border-box; }
		html, body {
			margin: 0;
			padding: 0;
			width: 100%;
			height: 100%;
			overflow: hidden;
		}
		/*
		 * VS Code injects --vscode-* custom properties as an inline style on
		 * <body>, so our derived palette must live on a body-or-descendant
		 * selector too — declaring it on :root (html) would see none of them,
		 * since custom properties only inherit downward from where they're set.
		 */
		body {
			--font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
			--bg: var(--vscode-editor-background);
			--panel: var(--vscode-editorWidget-background, var(--vscode-sideBar-background, var(--bg)));
			--node-bg: var(--vscode-editorWidget-background, var(--vscode-input-background, var(--bg)));
			--node-header: var(--vscode-editorGroupHeader-tabsBackground, var(--vscode-tab-activeBackground, var(--vscode-titleBar-activeBackground, var(--node-bg))));
			--border: var(--vscode-panel-border, var(--vscode-widget-border, rgba(128, 128, 128, 0.35)));
			--accent: var(--vscode-focusBorder, var(--vscode-textLink-foreground, #4daafc));
			--accent-dim: var(--vscode-textLink-foreground, var(--accent));
			--text: var(--vscode-editor-foreground, var(--vscode-foreground));
			--text-dim: var(--vscode-descriptionForeground, var(--text));
			--empty: var(--text-dim);
			--error-fg: var(--vscode-inputValidation-errorForeground, var(--vscode-errorForeground, #f48771));
			--error-bg: var(--vscode-inputValidation-errorBackground, rgba(244, 135, 113, 0.12));
			--error-border: var(--vscode-inputValidation-errorBorder, var(--error-fg));

			background: var(--bg);
			color: var(--text);
			font-family: var(--font-family);
		}
		#toolbar {
			position: fixed;
			top: 0; left: 0; right: 0;
			height: 40px;
			display: flex;
			align-items: center;
			gap: 10px;
			padding: 0 14px;
			background: var(--panel);
			border-bottom: 1px solid var(--border);
			z-index: 10;
			font-size: 12px;
			color: var(--text-dim);
		}
		#toolbar .dot {
			width: 7px; height: 7px; border-radius: 50%;
			background: var(--accent);
			box-shadow: 0 0 8px var(--accent);
		}
		#toolbar .spacer { flex: 1; }
		#toolbar button {
			background: transparent;
			border: 1px solid var(--border);
			color: var(--text-dim);
			border-radius: 5px;
			padding: 3px 9px;
			font-size: 11px;
			cursor: pointer;
		}
		#toolbar button:hover { color: var(--text); border-color: var(--accent); }
		#stage {
			position: absolute;
			top: 40px; left: 0; right: 0; bottom: 0;
			overflow: hidden;
			cursor: grab;
		}
		#stage.panning { cursor: grabbing; }
		#viewport {
			position: absolute;
			top: 0; left: 0;
			transform-origin: 0 0;
		}
		#edges {
			position: absolute;
			top: 0; left: 0;
			overflow: visible;
			pointer-events: none;
		}
		.node {
			position: absolute;
			background: var(--node-bg);
			border: 1px solid var(--border);
			border-radius: 8px;
			box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
			overflow: hidden;
			user-select: none;
		}
		.node .head {
			height: 34px;
			display: flex;
			align-items: center;
			background: var(--node-header);
			padding: 0 10px;
			font-size: 12.5px;
			font-weight: 600;
			color: var(--text);
			cursor: grab;
			border-bottom: 1px solid var(--border);
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}
		.node .head:active { cursor: grabbing; }
		.node .body {
			padding: 8px 10px;
			font-size: 11.5px;
			line-height: 18px;
			color: var(--text-dim);
		}
		.node .field-title {
			color: var(--text);
			font-weight: 600;
			margin-top: 4px;
		}
		.node .field-title:first-child { margin-top: 0; }
		.node .item {
			padding-left: 10px;
			position: relative;
		}
		.node .item::before {
			content: '–';
			position: absolute;
			left: 0;
			color: var(--accent-dim);
		}
		.node.id-only .body { display: none; }
		.node.id-only .head { border-bottom: none; }
		.edge-label {
			fill: var(--text-dim);
			font-size: 10.5px;
		}
		.edge-label-bg {
			fill: var(--panel);
			opacity: 0.9;
		}
		#empty {
			position: absolute;
			top: 50%; left: 50%;
			transform: translate(-50%, -50%);
			color: var(--empty);
			font-size: 13px;
			text-align: center;
			max-width: 360px;
		}
		#error {
			position: absolute;
			top: 50%; left: 50%;
			transform: translate(-50%, -50%);
			color: var(--error-fg);
			font-size: 13px;
			text-align: center;
			max-width: 460px;
			white-space: pre-wrap;
			display: none;
			border: 1px solid var(--error-border);
			background: var(--error-bg);
			border-radius: 8px;
			padding: 12px 16px;
		}
	</style>
</head>
<body>
	<div id="toolbar">
		<span class="dot"></span>
		<span id="toolbar-title">no source</span>
		<span class="spacer"></span>
		<button id="export-svg">Export SVG</button>
		<button id="export-png">Export PNG</button>
		<button id="zoom-in">+</button>
		<button id="zoom-out">–</button>
		<button id="zoom-reset">reset</button>
	</div>
	<div id="stage">
		<div id="viewport">
			<svg id="edges"></svg>
			<div id="nodes"></div>
		</div>
		<div id="empty">Открой текстовый файл со схемой (DSL) и сохрани, чтобы увидеть диаграмму.</div>
		<div id="error"></div>
	</div>

	<script nonce="${nonce}">
		const vscode = acquireVsCodeApi();
		const stage = document.getElementById('stage');
		const viewport = document.getElementById('viewport');
		const edgesSvg = document.getElementById('edges');
		const nodesLayer = document.getElementById('nodes');
		const emptyEl = document.getElementById('empty');
		const errorEl = document.getElementById('error');
		const titleEl = document.getElementById('toolbar-title');

		let scale = 1;
		let panX = 40;
		let panY = 20;
		let blocksByKey = new Map();
		let currentEdges = [];

		function applyTransform() {
			viewport.style.transform = 'translate(' + panX + 'px,' + panY + 'px) scale(' + scale + ')';
		}
		applyTransform();

		document.getElementById('zoom-in').addEventListener('click', () => { scale = Math.min(2.5, scale + 0.15); applyTransform(); });
		document.getElementById('zoom-out').addEventListener('click', () => { scale = Math.max(0.3, scale - 0.15); applyTransform(); });
		document.getElementById('zoom-reset').addEventListener('click', () => { scale = 1; panX = 40; panY = 20; applyTransform(); });

		stage.addEventListener('wheel', (e) => {
			e.preventDefault();
			const delta = -e.deltaY * 0.001;
			scale = Math.min(2.5, Math.max(0.25, scale + delta));
			applyTransform();
		}, { passive: false });

		let panning = false;
		let panStart = { x: 0, y: 0 };
		let panOrigin = { x: 0, y: 0 };
		stage.addEventListener('mousedown', (e) => {
			if (e.target !== stage && e.target !== viewport) { return; }
			panning = true;
			stage.classList.add('panning');
			panStart = { x: e.clientX, y: e.clientY };
			panOrigin = { x: panX, y: panY };
		});
		window.addEventListener('mousemove', (e) => {
			if (!panning) { return; }
			panX = panOrigin.x + (e.clientX - panStart.x);
			panY = panOrigin.y + (e.clientY - panStart.y);
			applyTransform();
		});
		window.addEventListener('mouseup', () => { panning = false; stage.classList.remove('panning'); });

		function escapeHtml(s) {
			return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
		}

		function cssVar(name, fallback) {
			const value = getComputedStyle(document.body).getPropertyValue(name).trim();
			return value || fallback;
		}

		function renderBlockContent(block) {
			const title = block.messages[0] ? block.messages[0].text : block.id;
			const bodyMessages = block.messages.slice(1);
			let bodyHtml = '';
			for (const message of bodyMessages) {
				bodyHtml += '<div class="field-title">' + escapeHtml(message.text) + '</div>';
				for (const comment of message.comments) {
					bodyHtml += '<div class="item">' + escapeHtml(comment) + '</div>';
				}
			}
			return {
				title: escapeHtml(title),
				body: bodyHtml,
				hasBody: bodyMessages.length > 0,
			};
		}

		function edgeAnchors(a, b) {
			// simple left-to-right anchor: right-center of a -> left-center of b
			if (b.x >= a.x + a.width * 0.5) {
				return {
					x1: a.x + a.width, y1: a.y + a.height / 2,
					x2: b.x, y2: b.y + b.height / 2,
				};
			} else if (b.x + b.width <= a.x + a.width * 0.5) {
				return {
					x1: a.x, y1: a.y + a.height / 2,
					x2: b.x + b.width, y2: b.y + b.height / 2,
				};
			}
			return {
				x1: a.x + a.width / 2, y1: a.y + (b.y > a.y ? a.height : 0),
				x2: b.x + b.width / 2, y2: b.y + (b.y > a.y ? 0 : b.height),
			};
		}

		function redrawEdges() {
			let svg = '<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">' +
				'<path d="M0,0 L10,5 L0,10 z" fill="var(--accent-dim)" /></marker></defs>';

			for (const edge of currentEdges) {
				const a = blocksByKey.get(edge.from);
				const b = blocksByKey.get(edge.to);
				if (!a || !b) { continue; }
				const p = edgeAnchors(a, b);
				const mx = (p.x1 + p.x2) / 2;
				const c1x = p.x1 + (mx - p.x1) * 0.6;
				const c2x = p.x2 - (p.x2 - mx) * 0.6;
				const path = 'M ' + p.x1 + ' ' + p.y1 + ' C ' + c1x + ' ' + p.y1 + ', ' + c2x + ' ' + p.y2 + ', ' + p.x2 + ' ' + p.y2;
				svg += '<path d="' + path + '" fill="none" stroke="var(--accent-dim)" stroke-width="1.6" marker-end="url(#arrow)" opacity="0.85" />';

				if (edge.label) {
					const lx = (p.x1 + p.x2) / 2;
					const ly = (p.y1 + p.y2) / 2;
					const w = Math.min(220, edge.label.length * 6 + 12);
					svg += '<rect class="edge-label-bg" x="' + (lx - w / 2) + '" y="' + (ly - 9) + '" width="' + w + '" height="16" rx="4"></rect>';
					svg += '<text class="edge-label" x="' + lx + '" y="' + (ly + 3) + '" text-anchor="middle">' + escapeHtml(edge.label) + '</text>';
				}
			}
			edgesSvg.innerHTML = svg;
		}

		function makeDraggable(el, block) {
			const head = el.querySelector('.head');
			let dragging = false;
			let start = { x: 0, y: 0 };
			let origin = { x: 0, y: 0 };

			head.addEventListener('mousedown', (e) => {
				e.stopPropagation();
				dragging = true;
				start = { x: e.clientX, y: e.clientY };
				origin = { x: block.x, y: block.y };
			});
			window.addEventListener('mousemove', (e) => {
				if (!dragging) { return; }
				const dx = (e.clientX - start.x) / scale;
				const dy = (e.clientY - start.y) / scale;
				block.x = origin.x + dx;
				block.y = origin.y + dy;
				el.style.left = block.x + 'px';
				el.style.top = block.y + 'px';
				redrawEdges();
			});
			window.addEventListener('mouseup', () => {
				if (dragging) {
					dragging = false;
					vscode.postMessage({ type: 'move', id: block.id, index: block.index, x: block.x, y: block.y });
				}
			});
		}

		function render(model) {
			currentEdges = model.edges;
			blocksByKey = new Map();
			nodesLayer.innerHTML = '';
			emptyEl.style.display = model.blocks.length ? 'none' : 'block';

			edgesSvg.setAttribute('width', Math.max(model.width, 200));
			edgesSvg.setAttribute('height', Math.max(model.height, 200));
			viewport.style.width = Math.max(model.width, 200) + 'px';
			viewport.style.height = Math.max(model.height, 200) + 'px';

			for (const block of model.blocks) {
				blocksByKey.set(block.key, block);
				const content = renderBlockContent(block);
				const el = document.createElement('div');
				el.className = 'node' + (content.hasBody ? '' : ' id-only');
				el.style.left = block.x + 'px';
				el.style.top = block.y + 'px';
				el.style.width = block.width + 'px';
				el.style.minHeight = block.height + 'px';
				el.innerHTML = '<div class="head">' + content.title + '</div><div class="body">' + content.body + '</div>';
				nodesLayer.appendChild(el);
				makeDraggable(el, block);
			}

			redrawEdges();
		}

		// ---- Export (SVG / PNG) ----
		// Builds a self-contained SVG (plain rect/text, no foreignObject) from the
		// *current* live node positions (including manual drags), so exports always
		// match what's on screen — including the active VS Code theme's colors,
		// resolved to concrete values since the exported file has no CSS variables.

		function exportBounds() {
			let maxX = 0;
			let maxY = 0;
			for (const b of blocksByKey.values()) {
				maxX = Math.max(maxX, b.x + b.width);
				maxY = Math.max(maxY, b.y + b.height);
			}
			return { width: maxX + 40, height: maxY + 40 };
		}

		function buildExportSvg() {
			const bounds = exportBounds();
			const W = Math.max(bounds.width, 200);
			const H = Math.max(bounds.height, 200);

			const fontFamily = cssVar('--font-family', 'Segoe UI, Helvetica, Arial, sans-serif');
			const bg = cssVar('--bg', '#1e1e1e');
			const panel = cssVar('--panel', '#252526');
			const nodeBg = cssVar('--node-bg', '#252526');
			const nodeHeader = cssVar('--node-header', '#2d2d30');
			const border = cssVar('--border', '#454545');
			const text = cssVar('--text', '#cccccc');
			const textDim = cssVar('--text-dim', '#9d9d9d');
			const accentDim = cssVar('--accent-dim', '#4daafc');

			let svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" font-family="' + fontFamily + '">';
			svg += '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="' + bg + '" />';
			svg += '<defs><marker id="arrow-export" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">' +
				'<path d="M0,0 L10,5 L0,10 z" fill="' + accentDim + '" /></marker></defs>';

			for (const edge of currentEdges) {
				const a = blocksByKey.get(edge.from);
				const b = blocksByKey.get(edge.to);
				if (!a || !b) { continue; }
				const p = edgeAnchors(a, b);
				const mx = (p.x1 + p.x2) / 2;
				const c1x = p.x1 + (mx - p.x1) * 0.6;
				const c2x = p.x2 - (p.x2 - mx) * 0.6;
				const path = 'M ' + p.x1 + ' ' + p.y1 + ' C ' + c1x + ' ' + p.y1 + ', ' + c2x + ' ' + p.y2 + ', ' + p.x2 + ' ' + p.y2;
				svg += '<path d="' + path + '" fill="none" stroke="' + accentDim + '" stroke-width="1.6" marker-end="url(#arrow-export)" opacity="0.85" />';
				if (edge.label) {
					const lx = (p.x1 + p.x2) / 2;
					const ly = (p.y1 + p.y2) / 2;
					const w = Math.min(220, edge.label.length * 6 + 12);
					svg += '<rect x="' + (lx - w / 2) + '" y="' + (ly - 9) + '" width="' + w + '" height="16" rx="4" fill="' + panel + '" opacity="0.9" />';
					svg += '<text x="' + lx + '" y="' + (ly + 3) + '" text-anchor="middle" font-size="10.5" fill="' + textDim + '">' + escapeHtml(edge.label) + '</text>';
				}
			}

			for (const block of blocksByKey.values()) {
				const title = block.messages[0] ? block.messages[0].text : block.id;
				const bodyMessages = block.messages.slice(1);
				const hasBody = bodyMessages.length > 0;

				svg += '<g>';
				svg += '<rect x="' + block.x + '" y="' + block.y + '" width="' + block.width + '" height="' + block.height + '" rx="8" fill="' + nodeBg + '" stroke="' + border + '" />';
				if (hasBody) {
					svg += '<path d="M ' + block.x + ' ' + (block.y + 20) + ' L ' + block.x + ' ' + (block.y + 8) +
						' Q ' + block.x + ' ' + block.y + ' ' + (block.x + 8) + ' ' + block.y +
						' L ' + (block.x + block.width - 8) + ' ' + block.y +
						' Q ' + (block.x + block.width) + ' ' + block.y + ' ' + (block.x + block.width) + ' ' + (block.y + 8) +
						' L ' + (block.x + block.width) + ' ' + (block.y + 20) + ' Z" fill="' + nodeHeader + '" />';
					svg += '<line x1="' + block.x + '" y1="' + (block.y + 28) + '" x2="' + (block.x + block.width) + '" y2="' + (block.y + 28) + '" stroke="' + border + '" />';
				} else {
					svg += '<rect x="' + block.x + '" y="' + block.y + '" width="' + block.width + '" height="' + block.height + '" rx="8" fill="' + nodeHeader + '" />';
				}
				svg += '<text x="' + (block.x + 10) + '" y="' + (block.y + 18) + '" font-size="12.5" font-weight="600" fill="' + text + '">' + escapeHtml(title) + '</text>';

				if (hasBody) {
					let ty = block.y + 28 + 16;
					for (const message of bodyMessages) {
						svg += '<text x="' + (block.x + 10) + '" y="' + ty + '" font-size="11.5" font-weight="600" fill="' + text + '">' + escapeHtml(message.text) + '</text>';
						ty += 18;
						for (const comment of message.comments) {
							svg += '<text x="' + (block.x + 18) + '" y="' + ty + '" font-size="11.5" fill="' + textDim + '">– ' + escapeHtml(comment) + '</text>';
							ty += 18;
						}
					}
				}
				svg += '</g>';
			}

			svg += '</svg>';
			return svg;
		}

		document.getElementById('export-svg').addEventListener('click', () => {
			const svg = buildExportSvg();
			vscode.postMessage({ type: 'export', format: 'svg', data: svg });
		});

		document.getElementById('export-png').addEventListener('click', () => {
			const svg = buildExportSvg();
			const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
			const url = URL.createObjectURL(svgBlob);
			const img = new Image();
			img.onload = () => {
				const scaleFactor = 2;
				const canvas = document.createElement('canvas');
				canvas.width = img.width * scaleFactor;
				canvas.height = img.height * scaleFactor;
				const ctx = canvas.getContext('2d');
				ctx.scale(scaleFactor, scaleFactor);
				ctx.drawImage(img, 0, 0);
				URL.revokeObjectURL(url);
				const dataUrl = canvas.toDataURL('image/png');
				vscode.postMessage({ type: 'export', format: 'png', data: dataUrl.split(',')[1] });
			};
			img.onerror = () => {
				URL.revokeObjectURL(url);
				vscode.postMessage({ type: 'export-error', message: 'Failed to rasterize diagram to PNG.' });
			};
			img.src = url;
		});

		window.addEventListener('message', (event) => {
			const msg = event.data;
			if (msg.type === 'update') {
				titleEl.textContent = (msg.model && msg.model.title) || msg.fileName || 'diagram';
				if (msg.error) {
					errorEl.textContent = msg.error;
					errorEl.style.display = 'block';
					emptyEl.style.display = 'none';
					nodesLayer.innerHTML = '';
					edgesSvg.innerHTML = '';
					blocksByKey = new Map();
					currentEdges = [];
				} else {
					errorEl.style.display = 'none';
					render(msg.model);
				}
			}
		});

		vscode.postMessage({ type: 'ready' });
	</script>
</body>
</html>`;
}
