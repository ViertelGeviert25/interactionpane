# InteractionPane

InteractionPane is a React and TypeScript image viewer for panning and zooming images inside a bounded pane. It supports SVG and common raster formats such as PNG and JPEG.

## Features

- Fits an image into the pane when it loads; smaller images are not enlarged.
- Drag to pan the image.
- Hold **Ctrl** and use the mouse wheel to zoom around the pointer.
- Use the fit button to restore the fitted view.
- Content outside the pane is clipped instead of making the page scroll.

## Technical details

- Images are rendered with the browser's `<img>` element. SVG, PNG, JPEG, and other browser-supported image formats can be used.
- The pane fills its parent container, so the parent must have a defined width and height.
- The initial scale is calculated from the image's intrinsic dimensions and the available pane size. The image is not scaled above its natural size.
- The minimum zoom is the fitted scale; the maximum zoom is 50×.
- SVG files are rendered as images, not embedded documents. Scripts and interactive elements inside an SVG are not available.

## Development

Install Node.js and npm, then run:

```sh
npm install
npm run dev
```

Available scripts:

| Command | Description |
| --- | --- |
| `npm run build` | Type-check TypeScript and build the production app to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Check source files with Oxlint |
| `npm run format` | Format source files |
| `npm run format:check` | Check source formatting |

## Technology

The application is built with React, TypeScript, and Vite. Its UI uses MUI, with icons from Material Design Icons.
