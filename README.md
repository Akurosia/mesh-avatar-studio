# Mesh Avatar Studio

Edit a mesh avatar rig over a source illustration and preview its animation locally in your browser.
Drag centers, pivots, strand nodes and polygon vertices; resize Gaussian regions; adjust numeric
fields; and test face angles, eye and mouth openings, breathing and secondary motion.

## Run

Requires Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Use **Open rig** to load `rig.json`, then **Open image folder**
to choose the folder containing your source and pre-cut assets. The folder may include its own
`rig.json`; if present, it is loaded along with the images. Processing stays in the browser.

```text
project/
  rig.json
  source.png
  built/
    layers.json
    base.png
    hairmask.png
    eye0_ball.png
    ...other cut-out layers named in layers.json
    sprites/                 # optional drawn eye/mouth variants
      sprites.json
      ...sprite images
```

Source and cut-out images are not bundled. If you have the matching miko-qipao sample images, place
`source.png` under `samples/miko-qipao/` and the cut-out images under `samples/miko-qipao/built/`.
The app loads the sample automatically when its images are available. Otherwise it opens an
empty workspace. The included JSON files describe geometry and asset rectangles.

## Editing

- Drag a handle or select an item to edit its numeric fields.
- Double-click a polygon/polyline edge to insert a vertex; Alt-click a vertex to remove it.
- Use the mouse wheel to zoom at the cursor; Space-drag or middle-drag to pan; **Fit** resets the view.
- **Undo** / **Redo** restore edits. Keyboard shortcuts: Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z and Ctrl/Cmd+S.
- **Save rig** downloads the current JSON. Dropping a JSON file also loads it.
- Disable **Idle animation** for a stable pose comparison, or use **Stress test** to sweep angles.

Editing a cut-out outline marks the layers stale. Existing image pixels and sampled eye curves
stay unchanged until the planned layer builder regenerates the assets.

## Verify

```sh
npm run lint
npm test
npm run build
npx playwright install chromium
npm run e2e
```

Tests that require sample images report a reason and skip when those images are absent.
Geometry, validation, history, sensitivity and empty-workspace checks still run.
`docs/screenshots/` stores local visual verification evidence and is excluded from version control.
