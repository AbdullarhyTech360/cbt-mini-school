/**
 * Watch script to monitor icon-related files and automatically rebuild Material Symbols fonts
 * This script watches for changes in:
 * - HTML templates using material-symbols classes
 * - CSS files with icon definitions
 * - JavaScript files with icon references
 * 
 * When changes are detected, it automatically copies the font files to the static/dist directory
 */

const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');

// Paths to watch for icon-related changes
const WATCH_PATTERNS = [
  'templates/**/*.html',           // All HTML templates
  'app/templates/**/*.html',       // App HTML templates
  'app/static/css/**/*.css',       // CSS files with icon definitions
  'app/static/js/**/*.js',         // JS files with icon references
  'static/js/**/*.js',             // Static JS files
  'static/src/**/*.css',           // Alternative CSS files
];

// Font files to copy
const FONT_FILES = [
  'material-symbols-outlined',
  'material-symbols-rounded',
  'material-symbols-sharp'
];

// Debounce timer to prevent multiple rebuilds from rapid changes
let debounceTimer = null;
const DEBOUNCE_DELAY = 1000; // 1 second

/**
 * Copy Material Symbols font files from node_modules to static/dist
 */
function copyFonts() {
  try {
    console.log('\n[Material Symbols] Detected icon-related changes, rebuilding fonts...');
    
    FONT_FILES.forEach(fontFile => {
      const sourceFile = path.join(__dirname, '..', 'node_modules', 'material-symbols', `${fontFile}.woff2`);
      const destFile = path.join(__dirname, '..', 'static', 'dist', `${fontFile}.woff2`);
      
      // Ensure destination directory exists
      const destDir = path.dirname(destFile);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      
      // Copy the font file
      if (fs.existsSync(sourceFile)) {
        fs.copyFileSync(sourceFile, destFile);
        console.log(`✓ Copied ${fontFile}.woff2`);
      } else {
        console.warn(`⚠ Source file not found: ${sourceFile}`);
      }
    });
    
    console.log('[Material Symbols] Font rebuild complete!\n');
  } catch (error) {
    console.error('[Material Symbols] Error rebuilding fonts:', error.message);
  }
}

/**
 * Check if a file contains material-symbols references
 */
function containsMaterialSymbols(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content.includes('material-symbols') || 
           content.includes('material-icons') ||
           content.includes('@font-face');
  } catch (error) {
    return false;
  }
}

/**
 * Handle file change events with debouncing
 */
function handleFileChange(filePath) {
  // Only process if file contains material-symbols references
  if (!containsMaterialSymbols(filePath)) {
    return;
  }

  // Clear existing debounce timer
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  // Set new debounce timer
  debounceTimer = setTimeout(() => {
    copyFonts();
    debounceTimer = null;
  }, DEBOUNCE_DELAY);
}

/**
 * Initialize file watcher
 */
function initializeWatcher() {
  console.log('[Material Symbols] Watching for icon-related changes...');
  console.log(`[Material Symbols] Monitoring patterns: ${WATCH_PATTERNS.join(', ')}`);
  
  const watcher = chokidar.watch(WATCH_PATTERNS, {
    ignored: [
      'node_modules/**',
      'static/dist/**',
      '**/.git/**',
      '**/.*',
      '**/__pycache__/**',
      '**/*.pyc'
    ],
    persistent: true,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 100
    }
  });

  watcher
    .on('add', (filePath) => {
      console.log(`[Material Symbols] File added: ${filePath}`);
      handleFileChange(filePath);
    })
    .on('change', (filePath) => {
      console.log(`[Material Symbols] File changed: ${filePath}`);
      handleFileChange(filePath);
    })
    .on('error', (error) => {
      console.error('[Material Symbols] Watcher error:', error);
    });

  // Initial copy of fonts on startup
  console.log('[Material Symbols] Running initial font setup...');
  copyFonts();

  process.on('SIGINT', () => {
    console.log('\n[Material Symbols] Stopping font watcher...');
    watcher.close();
    process.exit(0);
  });
}

// Start the watcher
initializeWatcher();