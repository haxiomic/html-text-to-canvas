/**
 * Given a HTML string or HTMLElement, returns a canvas with a replica of the text, including fonts, layout, formatting and colors
 * @param {string | HTMLElement} htmlOrElement
 * @param {{
 * 	?pixelRatio: number,
 * 	?offscreenCanvas: boolean,
 * 	?overrideCanvas: HTMLCanvasElement,
 * }} options
 * @returns {HTMLCanvasElement} canvas element
 */
function htmlTextToCanvas(htmlOrElement, options = {}) {
	options = {
		pixelRatio: 1.0,
		offscreenCanvas: false,
		overrideCanvas: null,
		...options
	}

	/**
	 * Marks each character with a span element so we can determine its location later
	 * @param {HTMLElement} el 
	 */
	function markCharacters(el) {
		/** @type {HTMLSpanElement[]} */
		let charSpans = [];
		for (let node of el.childNodes) {
			switch (node.nodeType) {
				case node.TEXT_NODE: {
					/** @type {Text} */
					let textNode = node;
					let chars = textNode.data.split('');
					let replacement = document.createElement('span');
					replacement.classList.add('__char_group__');
					chars.forEach(c => {
						let charSpan = document.createElement('span');
						charSpan.innerHTML = c;
						charSpans.push(charSpan);
						replacement.appendChild(charSpan);
					});
					textNode.replaceWith(replacement);
				} break;
				default: {
					charSpans = charSpans.concat(markCharacters(node));
				} break;
			}
		}
		return charSpans;
	}

	/**
	 * @param {HTMLElement} el 
	 */
	function unmarkCharacters(el) {
		for (let charGroup of el.querySelectorAll('.__char_group__')) {
			charGroup.replaceWith(charGroup.textContent);
		}
	}

	/** @type {HTMLElement} */
	let el;
	if (htmlOrElement instanceof HTMLElement) {
		el = htmlOrElement;
	} else {
		el = document.createElement('span');
		el.classList.toggle('__canvas_text__', true); // useful for debug
		el.innerHTML = htmlOrElement;
	}

	let removeElFromDom = false;
	if (!el.isConnected) {
		// use a parent el so we don't have to modify el's position to absolute
		let parentEl = document.createElement('span');
		parentEl.style.position = 'absolute';
		document.body.appendChild(parentEl);
		parentEl.appendChild(el);
		removeElFromDom = true;
	}

	let characterSpans = markCharacters(el);

	let textBBox = el.getBoundingClientRect();
	let canvas;
	if (options.overrideCanvas != null) {
		canvas = options.overrideCanvas;
	} else if (options.offscreenCanvas) {
		canvas = new OffscreenCanvas(textBBox.width * options.pixelRatio, textBBox.height * options.pixelRatio);
	} else {
		canvas = document.createElement('canvas');
		canvas.width = textBBox.width * options.pixelRatio;
		canvas.height = textBBox.height * options.pixelRatio;
		canvas.style.width = textBBox.width + 'px';
		canvas.style.height = textBBox.height + 'px';
	}

	let ctx = canvas.getContext('2d');

	// set background
	let elStyle = window.getComputedStyle(el);
	ctx.fillStyle = elStyle.backgroundColor;
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	for (let span of characterSpans) {
		let spanBBox = span.getBoundingClientRect();

		let style = window.getComputedStyle(span);

		let fontSpecifier = style.font;

		let fontSizeValue = parseFloat(style.fontSize);
		let fontSizeUnit = /([a-z%]+)$/i.exec(style.fontSize)[1];

		// if pixel ratio != 1.0 we need to adjust the font size
		// simple technique is to use a temporary element to manage the css parsing for us
		if (options.pixelRatio !== 1.0) {
			let el = document.createElement('span');
			el.style.font = style.font;
			el.style.fontSize = fontSizeValue * options.pixelRatio + fontSizeUnit;
			document.body.appendChild(el);
			fontSpecifier = window.getComputedStyle(el).font;
			el.remove();
		}

		ctx.font = fontSpecifier;
		ctx.fillStyle = style.color;

		ctx.textBaseline = "top";
		let textMetrics = ctx.measureText(span.textContent);
		
		// position of span relative to containing box
		let drawX = (spanBBox.left - textBBox.left) * options.pixelRatio;
		let drawY = (spanBBox.top - textBBox.top) * options.pixelRatio + textMetrics.fontBoundingBoxAscent;

		ctx.fillText(
			span.textContent,
			drawX, drawY
		);
	}
	
	unmarkCharacters(el);

	if (removeElFromDom) {
		el.remove();
	}

	return canvas;
}