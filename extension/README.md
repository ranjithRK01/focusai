# FocusAI Chrome Extension

## Development Setup

1. Navigate to the extension directory:
   ```bash
   cd extension
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `extension/dist` directory

## Environment Variables

Create a `.env` file in the extension directory:
```env
VITE_API_URL=http://localhost:3000
VITE_WEB_APP_URL=http://localhost:3000
```

## Project Structure

```
extension/
├── src/
│   ├── background/    # Service worker
│   ├── content/       # Content script for YouTube
│   ├── popup/         # Popup UI
│   ├── options/       # Options page
│   ├── lib/           # Utilities and services
│   └── types/         # TypeScript types
├── manifest.json
└── package.json
```
