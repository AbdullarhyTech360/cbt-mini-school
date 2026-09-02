const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'static', 'dist');
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

const FONT_FILES = [
    'material-symbols-outlined',
    'material-symbols-rounded',
    'material-symbols-sharp'
];

function copyFonts() {
    FONT_FILES.forEach(fontFile => {
        const sourceFile = path.join(__dirname, '..', 'node_modules', 'material-symbols', `${fontFile}.woff2`);
        const destFile = path.join(distDir, `${fontFile}.woff2`);
        if (fs.existsSync(sourceFile)) {
            fs.copyFileSync(sourceFile, destFile);
            console.log(`Copied ${fontFile}.woff2`);
        } else {
            console.warn(`Source font not found (skipping): ${path.relative(process.cwd(), sourceFile)}`);
        }
    });
}

console.log('Copying Material Symbols fonts...');
copyFonts();
console.log('Fonts copied successfully to static/dist/');