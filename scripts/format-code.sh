#!/bin/bash
# This script formats and lints the codebase using the configured ESLint and Prettier rules

# Display what we're going to do
echo "=== CoreDataStore Swagger MCP Formatter ==="
echo "This script will format and lint the codebase."
echo ""

# Make sure we have all dependencies
echo "Ensuring dependencies are installed..."
npm install

# Run ESLint first to check for issues
echo "Running ESLint to check for issues..."
npx eslint src/ --ext .js

# Run ESLint with --fix flag to automatically fix what it can
echo "Running ESLint with auto-fix..."
npx eslint src/ --ext .js --fix

# Run Prettier on all JavaScript files
echo "Running Prettier on JavaScript files..."
npx prettier --write "src/**/*.js"

# Display completion message
echo ""
echo "✅ Formatting and linting complete!"
echo "If there are remaining issues above, you may need to fix them manually."
