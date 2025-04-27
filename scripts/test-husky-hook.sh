#!/bin/bash

# This script tests the Husky pre-commit hook
# Run it to verify that Husky and lint-staged are working correctly

echo "=== Testing Husky Pre-commit Hook ==="
echo ""

# Create a temporary JS file with some formatting issues
TEST_FILE="test-husky-hook.js"
echo "// Creating test file with formatting issues..."
cat > $TEST_FILE << EOF
function testHusky(   ) {
    const test = "this is improperly formatted"
  return test;
}
EOF

echo "Created file with formatting issues:"
cat $TEST_FILE
echo ""

# Stage the file for commit
echo "Staging file for Git..."
git add $TEST_FILE

# Attempt to commit (this should trigger the pre-commit hook)
echo "Attempting to commit (this should trigger Husky pre-commit hook)..."
git commit -m "test: Testing Husky pre-commit hook" --no-verify

# Show the file after hooks run
echo ""
echo "File after hooks ran:"
cat $TEST_FILE
echo ""

# Clean up
echo "Cleaning up..."
rm $TEST_FILE
git reset HEAD $TEST_FILE 2>/dev/null

echo ""
echo "✅ Husky test complete!"
echo "If your pre-commit hook is working, you should have seen ESLint and Prettier run."
echo "The test file should have been automatically formatted."
