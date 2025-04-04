#!/bin/bash

# Make the server executable
chmod +x ./src/index.js

# Create .env file from example if it doesn't exist
if [ ! -f .env ]; then
  echo "Creating .env file from .env.example"
  cp .env.example .env
fi

# Install dependencies
echo "Installing dependencies..."
npm install

echo "Setup complete! You can now run the server with 'npm start'"
