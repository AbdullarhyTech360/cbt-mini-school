# Automatic Material Symbols Font Rebuild Setup

## Overview

This document explains the automatic rebuild process for Material Symbols fonts that has been implemented in this project. The system automatically detects changes to icon-related code and triggers font rebuilds without manual intervention.

## How It Works

### Automatic Detection

The system monitors the following file patterns for changes:
- `templates/**/*.html` - HTML templates using material-symbols classes
- `app/templates/**/*.html` - App HTML templates
- `app/static/css/**/*.css` - CSS files with icon definitions
- `app/static/js/**/*.js` - JavaScript files with icon references
- `static/js/**/*.js` - Static JavaScript files

### Smart Rebuild

When changes are detected:
1. The system checks if the changed file contains `material-symbols`, `material-icons`, or `@font-face` references
2. Uses debouncing (1 second delay) to prevent multiple rebuilds from rapid changes
3. Automatically copies Material Symbols font files from `node_modules` to `static/dist`
4. Logs the rebuild process with clear status messages

## Installation

The setup has already been configured. To ensure everything is ready:

```bash
npm install
```

This installs all required dependencies including `chokidar` for file watching.

## Usage

### Development Mode (Automatic Rebuild)

Start development with automatic font rebuilds:

```bash
npm run dev
```

This command:
- Runs Tailwind CSS in watch mode (`watch:css`)
- Runs the font watcher (`watch:fonts`) in parallel using `concurrently`
- Automatically rebuilds fonts when icon-related files change

### Production Build

Build the project for production:

```bash
npm run build
```

This command:
- Copies all Material Symbols fonts to `static/dist`
- Builds the Tailwind CSS output file

### Build CSS Only

To build CSS without watching or font operations:

```bash
npm run build:css
```

### Watch CSS Only

To watch CSS changes without the font watcher:

```bash
npm run watch:css
```

### Watch Fonts Only

To manually start the font watcher:

```bash
npm run watch:fonts
```

## What Gets Monitored

The font watcher monitors changes to:

### HTML Templates
```html
<span class="material-symbols-outlined">dashboard</span>
<span class="material-symbols-rounded">add</span>
<span class="material-symbols-sharp">delete</span>
```

### CSS Files
```css
@font-face {
  font-family: "Material Symbols Outlined";
  /* ... */
}

.material-symbols-outlined {
  /* ... */
}
```

### JavaScript References
```javascript
const icon = 'material-symbols-outlined';
document.innerHTML = `<span class="${icon}">menu</span>`;
```

## Font Files Automatically Managed

The following font files are automatically copied when changes are detected:

- `material-symbols-outlined.woff2`
- `material-symbols-rounded.woff2`
- `material-symbols-sharp.woff2`

These are copied from `node_modules/material-symbols/` to `static/dist/`.

## Implementation Details

### File Watcher Script

Location: `scripts/watch-fonts.js`

The script provides:
- Real-time file monitoring using Chokidar library
- Intelligent content checking (only rebuilds if material-symbols references exist)
- Debouncing to prevent rapid successive rebuilds
- Graceful shutdown handling
- Detailed logging for debugging

### Configuration

**Watched Patterns:**
```javascript
const WATCH_PATTERNS = [
  'templates/**/*.html',
  'app/templates/**/*.html',
  'app/static/css/**/*.css',
  'app/static/js/**/*.js',
  'static/js/**/*.js',
];
```

**Ignored Patterns:**
```javascript
const ignored = [
  'node_modules/**',
  'static/dist/**',
  '**/.git/**',
  '**/.*',
  '**/__pycache__/**',
  '**/*.pyc'
];
```

**Debounce Delay:** 1000ms (prevents multiple rebuilds from rapid changes)

## Troubleshooting

### Fonts Not Updating

If fonts are not updating automatically:

1. **Verify the watcher is running:**
   ```bash
   npm run dev
   ```
   You should see output like:
   ```
   [Material Symbols] Watching for icon-related changes...
   [Material Symbols] Monitoring patterns: templates/**/*.html, ...
   ```

2. **Check file paths:**
   - Ensure your icon changes are in monitored directories
   - Verify the file contains `material-symbols`, `material-icons`, or `@font-face` references

3. **Manual rebuild:**
   ```bash
   npm run build
   ```

### Multiple Rebuilds

If rebuilds are happening too frequently:
- The debounce delay is set to 1 second
- Files are only processed if they contain material-symbols references
- This prevents unnecessary font copying

### Clear Cache

If fonts are still cached in the browser:
1. Hard refresh: `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
2. Or clear browser cache manually

## Integration with Build Pipeline

The automatic rebuild is integrated with:
- **Tailwind CSS Watch:** Changes to CSS are detected and compiled
- **Font Watch:** Changes to icon-related files trigger font updates
- **Concurrent Execution:** Both processes run simultaneously in development

## Performance Notes

- **Debouncing:** Prevents excessive rebuilds (1 second window)
- **Content Checking:** Only processes files with icon references
- **Efficient Copying:** Uses Node.js native `copyFileSync` for speed
- **No Impact:** The watcher has minimal CPU/memory overhead

## Disabling Auto-Rebuild

To run without automatic font rebuilds:

```bash
npm run watch:css
```

This runs Tailwind CSS watch mode without the font watcher.

## Environment Variables

Currently, no environment variables are required for the automatic rebuild process. The system uses sensible defaults.

To add custom configuration in the future, modify `scripts/watch-fonts.js` and add:
```javascript
const DEBOUNCE_DELAY = process.env.FONT_REBUILD_DELAY || 1000;
```

## Related Files

- `package.json` - NPM scripts and dependencies
- `scripts/watch-fonts.js` - Font watcher implementation
- `tailwind.config.js` - Tailwind CSS configuration
- `app/static/css/input.css` - Main CSS file with @font-face declarations

## Future Enhancements

Possible improvements:
- Add custom Tailwind CSS plugin for icon detection
- Integrate with webpack or Vite for bundling
- Add file size optimization for font files
- Create build metrics dashboard
- Add CI/CD integration for automated builds
