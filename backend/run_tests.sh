#!/bin/bash
# Script to run backend tests

# Activate virtual environment
source venv/bin/activate

# Run tests with coverage
pytest --cov=. --cov-report=term-missing --cov-report=html -v

echo ""
echo "Coverage report generated in htmlcov/index.html"
