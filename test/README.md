# Test Directory

This directory contains test files for the CBT Mini School project.

## Test Structure

### Python Tests
Python unit tests and integration tests are located in the `python/` subdirectory.

### JavaScript Tests
JavaScript unit tests and integration tests are located in the `javascript/` subdirectory.

## Running Tests

### Python Tests
```bash
# Run all Python tests
python -m pytest test/python/

# Run specific test file
python -m pytest test/python/test_grading_system.py

# Run tests with coverage
python -m pytest test/python/ --cov=app
```

### JavaScript Tests
```bash
# Run all JavaScript tests
npm test

# Run specific test file
npm test test/javascript/test_client_pdf_generation.js
```

## Test Naming Conventions

- Python tests: `test_*.py`
- JavaScript tests: `test_*.js`

## Test Data

Test data files are located in the `data/` subdirectory.

## Test Utilities

Common test utilities and helper functions are located in the `utils/` subdirectory.
