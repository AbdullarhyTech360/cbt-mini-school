# Scripts Directory

This directory contains utility scripts for the CBT Mini School project.

## Data Scripts (`data/`)
Scripts related to data population and test data creation:
- `populate_demo_questions.py` - Populates the demo question bank with sample questions
- `create_test_data.py` - Creates test data for report generation testing

## Setup Scripts (`setup/`)
Scripts related to project setup and configuration:
- `initialize_all_data.py` - Initializes default data for the application
- `generate_ssl_cert.py` - Generates SSL certificates for HTTPS

## Usage

To run these scripts, navigate to the project root and execute them with Python:

```bash
# Example: Run demo questions population
python scripts/data/populate_demo_questions.py

# Example: Initialize all default data
python scripts/setup/initialize_all_data.py
```

Note: Some scripts may require specific environment configurations or database connections.
