# School Sections Management - Simple Guide

## What Was Added

A simple interface in the Settings page to manage school sections (like Nursery, Primary, Secondary, etc.)

## Location

**Admin Dashboard → Settings → School Sections**

## Features

### 1. Add Sections
- Two input fields:
  - **Section Name**: e.g., Nursery, Primary, Secondary
  - **Abbreviation**: e.g., NUR, PRI, SEC
- **Add Another Section** button to add multiple sections at once
- **Save Sections** button to save all entries

### 2. View Existing Sections
- Shows all previously saved sections
- Each section displays its name and abbreviation
- Delete button for each section

## How to Use

### Adding a Single Section

1. Go to Settings page
2. Open "School Sections" accordion
3. Enter section name (e.g., "Primary")
4. Enter abbreviation (e.g., "PRI")
5. Click "Save Sections"

### Adding Multiple Sections at Once

1. Fill in the first section name and abbreviation
2. Click "Add Another Section" button
3. Fill in the second section
4. Repeat for as many sections as needed
5. Click "Save Sections" to save all at once

### Deleting a Section

1. Find the section in "Existing Sections" list
2. Click "Delete" button next to it
3. Confirm deletion

## Example Sections

Common school sections:

| Section Name | Abbreviation |
|--------------|--------------|
| Nursery | NUR |
| Primary | PRI |
| Junior Secondary | JSS |
| Senior Secondary | SSS |

## Technical Details

### Files Modified
- `templates/admin/settings.html` - Added section management UI
- `static/js/admin/settings.js` - Added JavaScript functionality

### API Endpoints Used
- `POST /admin/api/sections` - Save new section
- `GET /admin/api/sections` - Load existing sections
- `DELETE /admin/api/sections/<id>` - Delete section

### Features
- ✅ Add single or multiple sections
- ✅ Input validation (name and abbreviation required)
- ✅ Automatic abbreviation uppercase conversion
- ✅ View existing sections
- ✅ Delete sections
- ✅ Real-time notifications (success/error)
- ✅ Dark mode support
- ✅ Responsive design

## Notes

- Abbreviations are automatically converted to uppercase
- Empty fields are ignored when saving
- You must enter both name and abbreviation for each section
- Sections can be used when creating classrooms
- Cannot delete sections that have classrooms assigned (protected by backend)

## Quick Start

1. Run seed script to initialize database:
   ```bash
   python seed_data.py
   ```

2. Login as admin
3. Go to Settings → School Sections
4. Add your school sections
5. Click Save Sections

Done! Your sections are now available for use throughout the system.