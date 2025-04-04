#!/bin/bash
# This script sets up the development environment
# It installs dependencies, configures tools, and ensures everything is ready to use

# Display header
echo "=== CoreDataStore Swagger MCP Development Setup ==="
echo "Setting up the development environment for the project."
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Verify ESLint installation
echo "🔍 Verifying ESLint installation..."
if ! npx --no-install eslint --version > /dev/null 2>&1; then
  echo "❌ ESLint not found. Installing..."
  npm install --save-dev eslint@8.57.0
else
  ESLINT_VERSION=$(npx --no-install eslint --version)
  echo "✅ ESLint found: $ESLINT_VERSION"
fi

# Verify Prettier installation
echo "🎨 Verifying Prettier installation..."
if ! npx --no-install prettier --version > /dev/null 2>&1; then
  echo "❌ Prettier not found. Installing..."
  npm install --save-dev prettier@3.2.5
else
  PRETTIER_VERSION=$(npx --no-install prettier --version)
  echo "✅ Prettier found: $PRETTIER_VERSION"
fi

# Setup Git hooks
echo "🔄 Setting up Git hooks..."
npm run hooks:setup

# Clean package-lock and reinstall if --clean flag is passed
if [ "$1" == "--clean" ]; then
  echo "🧹 Cleaning package-lock.json and node_modules..."
  rm -rf node_modules package-lock.json
  npm install
fi

echo ""
echo "✅ Development environment setup complete!"
echo ""
echo "🚀 You can now run:"
echo "  - npm run dev        # Start development server"
echo "  - npm run format:all # Format and lint code"
echo "  - npm run lint:fix   # Fix linting issues"
echo ""
echo "Happy coding! 🎉"
