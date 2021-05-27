/**
 * htmlTextToCanvas
 * 
 * @author haxiomic (George Corney)
 * @license MIT
 * @version 1.1.0
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
		let charGroups = [];
		for (let node of el.childNodes) {
			switch (node.nodeType) {
				case node.TEXT_NODE: {
					/** @type {Text} */
					let textNode = node;
					let chars = Array.from(textNode.data); // split('') but support emojis and others
					let charGroup = document.createElement('span');
					charGroup.classList.add('__char_group__');
					charGroup.__spans = new Array(chars.length);
					for (let i = 0; i < chars.length; i++) {
						let charSpan = document.createElement('span');
						charSpan.innerHTML = chars[i];
						charGroup.appendChild(charSpan);
						charGroup.__spans[i] = charSpan;
					}
					charGroups.push(charGroup);
					textNode.replaceWith(charGroup);
				} break;
				default: {
					charGroups = charGroups.concat(markCharacters(node));
				} break;
			}
		}
		return charGroups;
	}

	/**
	 * @param {HTMLElement} el
	 * @param {HTMLElement[]} charGroups
	 */
	function unmarkCharacters(el, charGroups) {
		for (let charGroup of charGroups) {
			charGroup.replaceWith(charGroup.textContent);
		}
	}

	/**
	 * Firefox currently does not generate a .font property after getComputedStyle so we much assemble one manually
	 * See https://stackoverflow.com/a/58533415
	 */
	function getFontFromComputedStyle(computedStyle, overrideFontSize) {
		let font = computedStyle.font;
		// Firefox returns the empty string for .font, so create the .font property manually
		if (font === '' || overrideFontSize) {
				// Firefox uses percentages for font-stretch, but Canvas does not accept percentages
				// so convert to keywords, as listed at:
				//   https://developer.mozilla.org/en-US/docs/Web/CSS/font-stretch
				const fontStretchLookupTable = {
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
						: computedStyle.fontStretch;
				font = computedStyle.fontStyle
						+ ' ' + computedStyle.fontVariant
						+ ' ' + computedStyle.fontWeight
						+ ' ' + fontStretch
						+ ' ' + (overrideFontSize || computedStyle.fontSize)
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

	let temporaryDomEl = null;
	if (!el.isConnected) {
		// use a parent el so we don't have to modify el's position to absolute
		let parentEl = document.createElement('span');
		parentEl.style.position = 'absolute';
		parentEl.style.top = '0';
		parentEl.style.left = '0';
		parentEl.appendChild(el);

		// remove this element from the dom when finished
		document.body.appendChild(parentEl);
		temporaryDomEl = parentEl;
	}

	let charGroups = markCharacters(el);

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

	for (let charGroup of charGroups) {
		let style = window.getComputedStyle(charGroup);

		let fontSpecifier = getFontFromComputedStyle(style);

		let fontSizeValue = parseFloat(style.fontSize);
		let fontSizeUnit = /([a-z%]+)$/i.exec(style.fontSize)[1];

		// if pixel ratio != 1.0 we need to adjust the font size
		// simple technique is to use a temporary element to manage the css parsing for us
		if (options.pixelRatio !== 1.0) {
			fontSpecifier = getFontFromComputedStyle(style, fontSizeValue * options.pixelRatio + fontSizeUnit);
		}

		ctx.font = fontSpecifier;
		ctx.fillStyle = style.color;
		ctx.textBaseline = "top";

		// apply text transform
		let text = charGroup.textContent;
		switch (style.textTransform) {
			case 'uppercase': {
				text = text.toUpperCase();
			} break;
			case 'lowercase': {
				text = text.toLowerCase();
			} break;
			case 'capitalize': {
				text = text.replace(/\b\w/g, l => l.toUpperCase());
			} break;
		}
		let chars = Array.from(text);

		let textMetrics = ctx.measureText('a');
		let yOffset = textMetrics.fontBoundingBoxAscent != null ? textMetrics.fontBoundingBoxAscent : 0;
		
		for (let i = 0; i < charGroup.__spans.length; i++) {
			let span = charGroup.__spans[i];
			// position of span relative to containing box
			let spanBBox = span.getBoundingClientRect();

			let drawX = (spanBBox.left - textBBox.left) * options.pixelRatio;
			let drawY = (spanBBox.top - textBBox.top) * options.pixelRatio + yOffset;

			ctx.fillText(
				chars[i],
				drawX, drawY
			);
		}
	}
	
	if (shouldUnmark) {
		unmarkCharacters(el, charGroups);
	}

	if (temporaryDomEl != null) {
		temporaryDomEl.remove();
	}

	return canvas;
}