#!/bin/bash

# This script acts as a proxy between Cline's MCP protocol and our HTTP-based MCP server
# It reads JSON-RPC requests from stdin, forwards them to the MCP server via curl,
# and writes the responses back to stdout

# Set up debugging
DEBUG_FILE="/tmp/mcp-proxy-debug.log"
echo "MCP Proxy started at $(date)" > "$DEBUG_FILE"

# Ensure unbuffered operation
exec 0</dev/stdin
exec 1>/dev/stdout
exec 2>/dev/stderr

# Set the MCP server URL
MCP_URL="http://localhost:3500/mcp"
echo "MCP URL: $MCP_URL" >> "$DEBUG_FILE"

# Loop to handle multiple requests
while IFS= read -r line; do
  # Debug the received request
  echo "$(date) - Received request: $line" >> "$DEBUG_FILE"

  # Forward the request to the MCP server
  echo "$(date) - Sending to server" >> "$DEBUG_FILE"
  response=$(curl -v -X POST -H "Content-Type: application/json" -d "$line" "$MCP_URL" 2>> "$DEBUG_FILE")

  # Debug the response
  echo "$(date) - Response from server: $response" >> "$DEBUG_FILE"

  # Write the response back to stdout
  echo "$response"
done

echo "$(date) - MCP Proxy exiting" >> "$DEBUG_FILE"
