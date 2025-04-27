#!/bin/bash
# Script to start the CoreDataStore Swagger MCP server for local development

# Colors for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Current directory of the script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${YELLOW}CoreDataStore Swagger MCP Server Starter${NC}"
echo -e "${YELLOW}=====================================${NC}"

# Check if .env file exists, create if it doesn't
if [ ! -f "$PROJECT_DIR/.env" ]; then
    echo -e "${YELLOW}Creating .env file from template...${NC}"
    cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
    echo -e "${GREEN}Created .env file successfully.${NC}"
else
    echo -e "${GREEN}Found existing .env file.${NC}"
fi

# Make sure the index.js file is executable
if [ ! -x "$PROJECT_DIR/src/index.js" ]; then
    echo -e "${YELLOW}Making the entry point executable...${NC}"
    chmod +x "$PROJECT_DIR/src/index.js"
    echo -e "${GREEN}Entry point is now executable.${NC}"
else
    echo -e "${GREEN}Entry point is already executable.${NC}"
fi

# Check if node_modules exist and install if needed
if [ ! -d "$PROJECT_DIR/node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    cd "$PROJECT_DIR" && npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to install dependencies. Please check the error messages above.${NC}"
        exit 1
    fi
    echo -e "${GREEN}Dependencies installed successfully.${NC}"
else
    echo -e "${GREEN}Dependencies already installed.${NC}"
fi

# Start the MCP server
echo -e "${YELLOW}Starting MCP Server...${NC}"
echo -e "${YELLOW}Server will be accessible via:${NC}"
echo -e "${GREEN}1. stdio transport (for MCP clients)${NC}"
echo -e "${GREEN}2. Express HTTP endpoint at http://localhost:3500/mcp (for HTTP clients)${NC}"
echo -e "${GREEN}3. Health check endpoint at http://localhost:3500/health${NC}"
echo -e "${GREEN}4. Tools listing at http://localhost:3500/tools${NC}"
echo -e ""
echo -e "${YELLOW}To use this server with VS Code:${NC}"
echo -e "${GREEN}1. Install the 'MCP Server Runner' extension${NC}"
echo -e "${GREEN}2. Configure mcp-config.json with your workspace path${NC}"
echo -e "${GREEN}3. Use the MCP panel in VS Code to manage connections${NC}"
echo -e ""
echo -e "${YELLOW}Press Ctrl+C to stop the server.${NC}"

# Run the server
cd "$PROJECT_DIR" && node src/index.js

# If the server was stopped, notify the user
echo -e "\n${RED}MCP Server stopped.${NC}"
