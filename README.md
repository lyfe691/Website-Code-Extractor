# Website Code Extractor

A Chrome/Edge extension that extracts a website's HTML, CSS, JavaScript, and images, then packages everything into a downloadable ZIP file.

[**Install from Chrome Web Store**](https://chromewebstore.google.com/detail/website-code-extractor/foppgeakfpkdghmmmflmblcidoofpohm)

## Features

- Extracts complete HTML with DOCTYPE preservation
- Collects linked CSS stylesheets, JS files, and images
- Resolves relative URLs to absolute paths
- Organizes resources into a clean folder structure
- Downloads everything as a single `.zip` file

## Local Development

1. Clone the repository
2. Open `chrome://extensions/` (or `edge://extensions/`)
3. Enable **Developer mode**
4. Click **Load unpacked** and select the project folder

## Usage

1. Navigate to any website
2. Click the extension icon in the toolbar
3. Click **Extract & Download**
4. A `.zip` file will be saved with the site's content

## Project Structure

```
├── manifest.json      # Extension config (Manifest V3)
├── popup.html         # Extension popup UI
├── popup.js           # Core extraction logic
├── background.js      # Service worker
├── dist/
│   └── jszip.min.js   # JSZip library for ZIP creation
└── icons/
    ├── icon64.png
    └── icon96.png
```

## Tech

- **Manifest V3** — Chrome Extensions API
- **JSZip** — ZIP file generation
- **Vanilla JS** — no framework dependencies

## License

MIT License — see [LICENSE](LICENSE) for details.
