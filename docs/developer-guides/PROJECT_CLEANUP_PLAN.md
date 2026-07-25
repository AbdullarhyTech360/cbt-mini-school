# Project Cleanup Plan

## Overview
This document tracks the cleanup and reorganization of the CBT Mini School project root directory and overall structure.

## Completed

### Phase 1: Test File Deduplication
- Removed 10 old standalone test files from `test/` root that were duplicated in `test/python/` and `test/javascript/`
- Removed dead placeholder `test/test1.py`
- `test/` now cleanly contains only `python/`, `javascript/`, and `README.md`

### Phase 2: Root Script Cleanup
- Deleted `create_test_data.py` from root (duplicate of `scripts/data/create_test_data.py`)
- Deleted `populate_demo_questions.py` from root (duplicate of `scripts/data/populate_demo_questions.py`)
- Deleted `generate_ssl_cert.py` from root (duplicate of `scripts/setup/generate_ssl_cert.py`)
- Moved `license_generator.py` to `scripts/setup/` (updated private_key.pem path to project root)
- Moved `initialize_all_data.py` to `scripts/setup/` (replaced thin wrapper)
- Updated all imports in `app.py` and `routes/admin_action_routes.py` to use `scripts.setup.initialize_all_data`

### Phase 3: Documentation Organization
- Created `docs/implementation/`, `docs/user-guides/`, `docs/developer-guides/`
- Moved `implementation_plan.md` → `docs/implementation/`
- Moved `QUESTIONS_EXTRACTION.md` → `docs/user-guides/`
- Moved `PROJECT_CLEANUP_PLAN.md` → `docs/developer-guides/`

### Phase 4: .gitignore Updates
- Added `public_key.pem` to `.gitignore` alongside existing `private_key.pem`

## Remaining

- Code cleanup: remove commented-out print statements, unused imports, standardize formatting
- Remove `public_key.pem` from git tracking (`git rm --cached public_key.pem`)
