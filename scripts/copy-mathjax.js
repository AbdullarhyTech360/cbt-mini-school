const fs = require('fs');
const path = require('path');

// Create static/dist directory if it doesn't exist
const distDir = path.join(__dirname, '..', 'static', 'dist');
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

// Create mathjax directory
const mathjaxDir = path.join(distDir, 'mathjax');
if (!fs.existsSync(mathjaxDir)) {
    fs.mkdirSync(mathjaxDir, { recursive: true });
}

// Copy MathJax files
const sourceDir = path.join(__dirname, '..', 'node_modules', 'mathjax', 'es5');
const targetDir = mathjaxDir;

function copyRecursive(src, dest) {
    if (!fs.existsSync(src)) {
        console.error(`Source directory not found: ${src}`);
        return;
    }

    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyRecursive(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

console.log('Copying MathJax files...');
copyRecursive(sourceDir, targetDir);
console.log('MathJax files copied successfully to static/dist/mathjax/');
