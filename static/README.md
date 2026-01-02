# Static Assets Directory

This directory contains all static assets for the CBT Mini School project.

## Directory Structure

- `css/` - Stylesheets for the application
- `js/` - JavaScript files for the application
- `images/` - Images and icons
- `fonts/` - Font files
- `uploads/` - User-uploaded content
  - `profile_images/` - User profile images
  - `school_logos/` - School logos

## Usage

Static assets are served by the Flask application from this directory. The URL path is `/static/`.

## Build Process

CSS and JavaScript files are built from source files in the `static/src/` directory using the build scripts in the `scripts/` directory.

## Optimization

Static assets are optimized for production using various tools:
- CSS is minified and optimized
- JavaScript is minified and bundled
- Images are compressed and optimized
- Fonts are subsetted to include only used characters
