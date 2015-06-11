# Photoride

This is a simple carousel-based image viewer for browsers. It supports all screen sizes, including mobile devices. It also has great support for really long image captions, with an innovative, scrolling UX.

There is only one requirement for this plugin to work: the width and height of the container must be known at initialization. This means that the gallery cannot be sized based on it's content, since the content is automatically sized for the container.

## Install

Download via NPM.

```sh
$ npm install photoride
```

Inside are compiled JavaScript and CSS files in the `dist/` directory. Add these to your HTML:

```html
<link type="text/css" rel="stylesheet" href="photoride.css" />
<script type="text/javascript" src="photoride.js"></script>
```

Or require and build with Browserify. Don't forget to include the stylesheet too.

```js
var Photoride = require("photoride");
```

## Usage

Photoride has both a JavaScript API, as well as an `data-*` attribute API that is created when the DOM is ready.

To use the `data-*` API, add an element to your HTML with the `data-photoride` attribute. You should also set a height, either as a percentage or fixed amount. Inside of this element should be one or more `<img>` elements with `src` attributes. You can add titles and captions using the code below, however those are optional. All options can be passed via further `data-*` attributes.

```html
<div data-photoride style="height: 600px;">
	<img src="img.jpg" title="My title" data-caption="#mycaption" />
	<div id="mycaption">
		<p>Some caption content.</p>
	</div>
</div>
```

To use the JavaScript API, create a new photoride instance from a containing element. Then push images into the gallery.

```js
var photoride = new Photoride("#mygallery", {
	backgroundSize: "contain",
	backgroundColor: "#333"
});

photoride.push("img.jpg", {
	title: "My title",
	caption: "<p>Some caption content.</p>",
	scrollDuration: 200
})
```

## Available Options

All options passed to the main Photoride instance are also passed to any images added to the gallery. This means that you can set "global" options via the main instance and have them transfer to all images in the gallery.

Also, all of these options can be set via the `data-*` API. Just convert the camel case to hyphens (ie. `backgroundSize` -> `data-background-size`).

__Photoride Options__

- `showCount` (default: `true`) - Whether or not the photo counter is visible.
- `resizeEvent` (default: `true`) - By default, an `onresize` event is added to the window to automatically refresh the gallery when the dimensions changes. You can disable the event by setting this to false.
- `enableTouch` (default: `true`) - By default, the user can scroll between images using their finger on a mobile device. You can disable touch interactions by setting this to false.
- `enableArrowKeys` (default: `true`) - By default, the user can press the left and right arrow keys to navigate between images. You can disable this feature by setting this to false.
- `loop` (default: `true`) - Whether or not the next and previous buttons loop around when reaching the end of the photos.

__Individual Image Options__

- `backgroundSize` (default: `cover`) - The css `background-size` for the image. When using the `data-*` API, this attribute is set automatically based on the size of the image.
- `backgroundColor` (default: `black`) - The color of the background behind the image. Useful for images with transparency, or when `backgroundSize` isn't set to `cover`.
- `scrollDuration` (default: `300`) - The number of milliseconds to animate scrolling for.
- `gradientSize` (default: `0.3`) - The percentage (as a decimal) from the bottom to show the gradient fade.
- `maxFade` (default: `0.75`) - The percentage (as a decimal) to fade the background in. Set to `1` to make it totally black when scrolled up.
