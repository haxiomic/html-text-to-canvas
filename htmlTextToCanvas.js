/**
 * htmlTextToCanvas
 * 
 * @author haxiomic (George Corney)
 * @license MIT
 * @version 1.0.0
 * @website https://github.com/haxiomic/html-text-to-canvas
 */

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
					let chars = Array.from(textNode.data); // split('') but support emojis and others
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

	/**
	 * Firefox currently does not generate a .font property after getComputedStyle so we much assemble one manually
	 * See https://stackoverflow.com/a/58533415
	 */
	function getFontFromComputedStyle(computedStyle) {
		let font = computedStyle.font;
		// Firefox returns the empty string for .font, so create the .font property manually
		if (font === '') {
				// Firefox uses percentages for font-stretch, but Canvas does not accept percentages
				// so convert to keywords, as listed at:
				//   https://developer.mozilla.org/en-US/docs/Web/CSS/font-stretch
				let fontStretchLookupTable = {
						'50%': 'ultra-condensed',
						'62.5%': 'extra-condensed',
						'75%': 'condensed',
						'87.5%': 'semi-condensed',
						'100%': 'normal',
						'112.5%': 'semi-expanded',
						'125%': 'expanded',
						'150%': 'extra-expanded',
						'200%': 'ultra-expanded'
				};
				// If the retrieved font-stretch percentage isn't found in the lookup table, use
				// 'normal' as a last resort.
				let fontStretch = fontStretchLookupTable.hasOwnProperty(computedStyle.fontStretch)
						? fontStretchLookupTable[computedStyle.fontStretch]
						: 'normal';
				font = computedStyle.fontStyle
						+ ' ' + computedStyle.fontVariant
						+ ' ' + computedStyle.fontWeight
						+ ' ' + fontStretch
						+ ' ' + computedStyle.fontSize
						+ '/' + computedStyle.lineHeight
						+ ' ' + computedStyle.fontFamily;
		}
		return font;
	}

	/** @type {HTMLElement} */
	let el;
	let shouldUnmark = true;
	if (htmlOrElement instanceof HTMLElement) {
		el = htmlOrElement;
	} else {
		el = document.createElement('span');
		el.classList.toggle('__canvas_text__', true); // useful for debug
		el.innerHTML = htmlOrElement;
		shouldUnmark = false;
	}

	let removeElFromDom = false;
	if (!el.isConnected) {
		// use a parent el so we don't have to modify el's position to absolute
		let parentEl = document.createElement('span');
		parentEl.style.position = 'absolute';
		parentEl.style.top = '0';
		parentEl.style.left = '0';
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
		canvas.style.width = textBBox.width + 'px';
		canvas.style.height = textBBox.height + 'px';
	}

	canvas.width = textBBox.width * options.pixelRatio;
	canvas.height = textBBox.height * options.pixelRatio;

	let ctx = canvas.getContext('2d');
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	// set background
	let elStyle = window.getComputedStyle(el);
	ctx.fillStyle = elStyle.backgroundColor;
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	for (let span of characterSpans) {
		let spanBBox = span.getBoundingClientRect();

		let style = window.getComputedStyle(span);

		let fontSpecifier = getFontFromComputedStyle(style);

		let fontSizeValue = parseFloat(style.fontSize);
		let fontSizeUnit = /([a-z%]+)$/i.exec(style.fontSize)[1];

		// if pixel ratio != 1.0 we need to adjust the font size
		// simple technique is to use a temporary element to manage the css parsing for us
		if (options.pixelRatio !== 1.0) {
			let el = document.createElement('span');
			el.style.font = style.font;
			el.style.fontSize = fontSizeValue * options.pixelRatio + fontSizeUnit;
			document.body.appendChild(el);
			fontSpecifier = getFontFromComputedStyle(window.getComputedStyle(el));
			el.remove();
		}

		ctx.font = fontSpecifier;
		ctx.fillStyle = style.color;

		ctx.textBaseline = "top";
		let textMetrics = ctx.measureText(span.textContent);
		
		// position of span relative to containing box
		let drawX = (spanBBox.left - textBBox.left) * options.pixelRatio;
		let drawY = (spanBBox.top - textBBox.top) * options.pixelRatio
			+ (textMetrics.fontBoundingBoxAscent != null ? textMetrics.fontBoundingBoxAscent : 0);

		ctx.fillText(
			span.textContent,
			drawX, drawY
		);
	}
	
	if (shouldUnmark) {
		unmarkCharacters(el);
	}

	if (removeElFromDom) {
		el.remove();
	}

	return canvas;
}