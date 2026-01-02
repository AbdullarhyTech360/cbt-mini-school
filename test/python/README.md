# Python Tests

This directory contains Python unit tests and integration tests for the CBT Mini School project.

## Test Files

- `test_grading_system.py` - Tests for the grading system functionality
- `test_report_optimization.py` - Tests for report generation optimization

## Running Tests

```bash
# Run all Python tests
python -m pytest test/python/

# Run specific test file
python -m pytest test/python/test_grading_system.py

# Run tests with coverage
python -m pytest test/python/ --cov=app

# Run tests with verbose output
python -m pytest test/python/ -v
```

## Test Configuration

Test configuration is defined in `pytest.ini` in the project root.

## Test Database

Tests use a separate test database that is created and destroyed for each test run.
