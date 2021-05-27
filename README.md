# Draw HTML Text to Canvas

<a href="https://haxiomic.github.io/html-text-to-canvas/demo.html"><img width="250px" align="right" src="https://user-images.githubusercontent.com/3742992/118414852-df289980-b69e-11eb-93f3-37e12b512c7e.png"></a>

Given a HTML string or HTMLElement, `htmlTextToCanvas()` returns a canvas with a replica of the text, including fonts, layout, formatting and colors draw using Context 2D

This technique leverages the browser's built-in text layout engine so all text layouts are supported. It works by determining the location and style of each character and drawing them individually

Another approach is to first convert the html to SVG, embedding fonts and images before drawing the SVG to canvas – this is more fully featured but more complex. For example: https://github.com/bubkoo/html-to-image

Be aware this approach only draws text. For backgrounds, borders, images and other styling you will need to use an approach like [html-to-image](https://github.com/bubkoo/html-to-image)

[Live demo](https://haxiomic.github.io/html-text-to-canvas/demo.html)

-----

## API

```typescript
type Options = {
	/**
	 * Used to increase size canvas texture for higher quality text. By default, the canvas texture has
	 * the same size as the input element in px units. These are decoupled from hardware pixel densities,
	 * so to achieve the same rendering quality, set `pixelRation: window.devicePixelRatio`
	 * 
	 * default 1.0
	 */
	?pixelRatio: number,

	/**
	 * If true, an OffscreenCanvas object will be returned
	 * 
	 * default false
	 */
	?offscreenCanvas: boolean,

	/**
	 * Used to provide a canvas element to draw on, by default `htmlTextToCanvas()` creates a new canvas
	 */
	?overrideCanvas: HTMLCanvasElement | OffscreenCanvas,
}

/**
 * Draw a html string to canvas
 */
function htmlTextToCanvas(htmlString: string, options?: Options): HTMLCanvasElement | OffscreenCanvas;

/**
 * Draw a html element
 */
function htmlTextToCanvas(htmlElement: HTMLElement, options?: Options): HTMLCanvasElement | OffscreenCanvas;
```

### Example: Canvas from a html string

```typescript
let canvas = htmlTextToCanvas('<h1>Header!</h1>', {pixelRatio: window.devicePixelRatio});
document.body.appendChild(canvas);
```

### Example: Canvas from a html element

```typescript
let header = document.createElement('h1');
header.innerHTML = 'Hello World!';

let canvas = htmlTextToCanvas(header, {pixelRatio: window.devicePixelRatio});
document.body.appendChild(canvas);
```
