#!/usr/bin/env python3
"""
Script to initialize all default data for the application
"""

from app import app
from utils.initialize_defaults import initialize_default_data
from populate_demo_questions import populate_demo_questions

def initialize_all_data():
    """Initialize all default data for the application"""
    with app.app_context():
        # Initialize default data
        initialize_default_data()

        # Populate demo questions
        populate_demo_questions()

if __name__ == "__main__":
    initialize_all_data()
