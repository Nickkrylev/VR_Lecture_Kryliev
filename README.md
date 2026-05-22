# VR Lecture — Variant 18

This repository contains my implementation of the control task for **variant 18**.

## What is included

- WebGL stereo rendering with **Sievert's Surface**
- marker-based AR page using **A-Frame + AR.js**
- registration marker files for **pattern 18**

## Local run

From the repository root:

```bash
python3 -m http.server 8000
```

Then open:

- AR page: `http://127.0.0.1:8000/index.html`
- marker page: `http://127.0.0.1:8000/marker.html`

## GitHub Pages

- AR page: `https://nickkrylev.github.io/VR_Lecture_Kryliev/index.html?v=18`
- marker page: `https://nickkrylev.github.io/VR_Lecture_Kryliev/marker.html?v=18`

## Files

- [index.html](/Users/mykytakryliev/Documents/GitHub/VR_Lecture_Kryliev/index.html) — main AR entry page
- [marker.html](/Users/mykytakryliev/Documents/GitHub/VR_Lecture_Kryliev/marker.html) — printable/display marker page
- [src/ar-surface-component.js](/Users/mykytakryliev/Documents/GitHub/VR_Lecture_Kryliev/src/ar-surface-component.js) — AR surface component
- [src/pattern-18.patt](/Users/mykytakryliev/Documents/GitHub/VR_Lecture_Kryliev/src/pattern-18.patt) — AR.js pattern file
- [src/pattern-18.png](/Users/mykytakryliev/Documents/GitHub/VR_Lecture_Kryliev/src/pattern-18.png) — marker image
- [Model.js](/Users/mykytakryliev/Documents/GitHub/VR_Lecture_Kryliev/Model.js) — Sievert's Surface mesh generation for the WebGL scene
