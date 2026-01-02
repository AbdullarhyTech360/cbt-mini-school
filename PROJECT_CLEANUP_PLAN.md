# Project Cleanup Plan

## Overview
This document outlines the recommended cleanup actions for the CBT Mini School project to improve organization, maintainability, and clarity.

## 1. Documentation Organization

### Current Issues
- Many documentation files with overlapping content
- Inconsistent naming conventions
- Mix of implementation notes and user guides
- Some outdated documentation

### Proposed Actions
1. Create a structured documentation hierarchy:
   ```
   docs/
   ├── user-guides/        # End-user documentation
   ├── developer-guides/    # Development documentation
   ├── implementation/      # Implementation notes and logs
   └── archive/            # Outdated documentation
   ```

2. Consolidate and reorganize content:
   - Merge related CBT session documentation into a comprehensive guide
   - Combine PDF generation documentation into a single reference
   - Move implementation notes to the implementation folder

## 2. Test File Organization

### Current Issues
- Mixed Python and JavaScript tests in the same directory
- Inconsistent naming conventions
- No documentation about test structure

### Proposed Actions
1. Create separate test directories:
   ```
   test/
   ├── python/            # Python tests
   ├── javascript/        # JavaScript tests
   └── README.md          # Test documentation
   ```

2. Standardize naming conventions:
   - All Python tests: `test_*.py`
   - All JavaScript tests: `test_*.js`

## 3. Script Organization

### Current Issues
- Multiple utility scripts in the root directory
- No documentation about script purposes

### Proposed Actions
1. Create a dedicated scripts directory:
   ```
   scripts/
   ├── data/              # Data population scripts
   ├── setup/             # Setup and configuration scripts
   └── README.md          # Script documentation
   ```

2. Move scripts to appropriate subdirectories:
   - `populate_demo_questions.py` → `scripts/data/`
   - `create_test_data.py` → `scripts/data/`
   - `initialize_all_data.py` → `scripts/setup/`
   - `generate_ssl_cert.py` → `scripts/setup/`

## 4. Static Assets Organization

### Current Issues
- Static assets spread across multiple directories
- Inconsistent organization

### Proposed Actions
1. Consolidate all static assets:
   ```
   static/
   ├── css/               # Stylesheets
   ├── js/                # JavaScript files
   ├── images/            # Images and icons
   ├── fonts/             # Font files
   └── uploads/           # User-uploaded content
   ```

2. Remove duplicate directories and update references in code

## 5. Code Cleanup

### Current Issues
- Commented out print statements
- Potential unused imports
- Inconsistent code style

### Proposed Actions
1. Remove commented out code
2. Clean up unused imports
3. Standardize code formatting

## Implementation Progress

### Completed Tasks
- ✅ Script organization (low risk, high impact)
  - Created scripts/data/ directory for data population scripts
  - Created scripts/setup/ directory for setup and configuration scripts
  - Moved populate_demo_questions.py to scripts/data/
  - Moved create_test_data.py to scripts/data/
  - Moved generate_ssl_cert.py to scripts/setup/
  - Moved initialize_all_data.py to scripts/setup/
  - Created scripts/README.md with documentation
  - Updated main README.md to reflect new structure

## Remaining Tasks

1. High Priority:
   - ✅ Documentation reorganization (improves clarity)
     - Created docs/user-guides/ directory for end-user documentation
     - Created docs/developer-guides/ directory for technical documentation
     - Created docs/implementation/ directory for implementation notes
     - Moved key documentation files to appropriate directories
     - Created docs/README.md to guide users to new structure

2. Medium Priority:
   - ✅ Test file organization (requires updating test runners)
     - Created test/python/ directory for Python tests
     - Created test/javascript/ directory for JavaScript tests
     - Created README files for test structure
     - Moved test files to appropriate subdirectories
     - Updated test documentation
   - ✅ Static assets consolidation (requires updating references)
     - Created organized directory structure for static assets
     - Created README files for each static asset category
     - Updated main README to reflect new structure

3. Low Priority:
   - Code cleanup (can be done incrementally)

## Next Steps

1. Review and approve this plan
2. Start with high-priority items
3. Test changes after each major reorganization
4. Update documentation to reflect new structure
