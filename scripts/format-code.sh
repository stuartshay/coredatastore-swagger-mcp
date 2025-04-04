#!/bin/bash
# This script formats and lints the codebase using the configured ESLint and Prettier rules

# Display what we're going to do
echo "=== CoreDataStore Swagger MCP Formatter ==="
echo "This script will format and lint the codebase."
echo ""

# Do NOT run npm install here as it can cause a loop with the prepare script
# If dependencies are missing, the user should run npm install separately

# Run ESLint first to check for issues
echo "Running ESLint to check for issues..."
npx --no-install eslint src/ --ext .js

# Run ESLint with --fix flag to automatically fix what it can
echo "Running ESLint with auto-fix..."
npx --no-install eslint src/ --ext .js --fix

# Run Prettier on all JavaScript files
echo "Running Prettier on JavaScript files..."
npx --no-install prettier --write "src/**/*.js"

# Display completion message
echo ""
echo "✅ Formatting and linting complete!"
echo "If there are remaining issues above, you may need to fix them manually."
