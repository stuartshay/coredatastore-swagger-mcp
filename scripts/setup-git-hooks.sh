#!/bin/bash
# This script sets up Git hooks using Husky and lint-staged

# Display what we're going to do
echo "=== CoreDataStore Swagger MCP Git Hooks Setup ==="
echo "Setting up pre-commit hooks for code quality checks."
echo ""

# Note: This script is called by npm prepare
# We should not call npm install here to avoid a loop
echo "Setting up Git hooks with husky and lint-staged..."

# Initialize husky (modern way - husky v9)
echo "Initializing husky..."
npx husky init

# Create pre-commit hook
echo "Creating pre-commit hook..."
cat > .husky/pre-commit << 'EOF'
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Run lint-staged to check files that are about to be committed
npx lint-staged
EOF

# Make the hook executable
chmod +x .husky/pre-commit

# Display completion message
echo ""
echo "✅ Git hooks setup complete!"
echo "Now your code will be automatically linted and formatted before each commit."
echo "- ESLint will check for code quality issues"
echo "- Prettier will ensure consistent formatting"
