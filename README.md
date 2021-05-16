# Draw HTML Text to Canvas

Given a HTML string or HTMLElement, `htmlTextToCanvas()` returns a canvas with a replica of the text, including fonts, layout, formatting and colors draw using Context 2D

This technique leverages the browser's built-in text layout engine so all text layouts are supported

For example, you may want to use this to easily generate formatted text for a WebGL game

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
```

### Call with a string
```typescript
htmlTextToCanvas(htmlString: string, options?: Options): HTMLCanvasElement | OffscreenCanvas;
```

Example usage
```typescript
let canvas = htmlTextToCanvas('<h1>Header!</h1>', {pixelRatio: window.devicePixelRatio});
document.body.appendChild(canvas);
```

### Call with a html element
```typescript
htmlTextToCanvas(htmlString: HTMLElement, options?: Options): HTMLCanvasElement | OffscreenCanvas;
```

Example usage
```typescript
let header = document.createElement('h1');
header.innerHTML = 'Hello World!';

let canvas = htmlTextToCanvas(header, {pixelRatio: window.devicePixelRatio});
document.body.appendChild(canvas);
```