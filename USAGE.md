# Using the CoreDataStore Swagger MCP Server with SSE Transport

This document describes how to connect to and use the CoreDataStore Swagger MCP server with its newly implemented SSE (Server-Sent Events) transport protocol.

## Server Implementation

The CoreDataStore Swagger MCP server now implements the SSE transport protocol from the Model Context Protocol (MCP) TypeScript SDK. This allows AI assistants like Cline to connect to the server remotely and access the CoreDataStore API's functionality through dynamically generated tools.

The server includes:
- Dynamic tool generation from the Swagger/OpenAPI specification
- Resource endpoints for API documentation
- SSE transport for remote client connections
- Express server for HTTP endpoints

## Connecting to the Server

### MCP Configuration

To connect to the server from an MCP client (like Cline), use the following configuration:

```json
{
  "mcpServers": {
    "coredatastore-swagger-mcp": {
      "autoApprove": [],
      "disabled": false,
      "timeout": 60,
      "url": "http://node-2.internal:3500/sse",
      "transportType": "sse"
    }
  }
}
```

This configuration should be placed in the appropriate configuration file for your MCP client.

### Available Endpoints

The server exposes the following HTTP endpoints:

- `GET /sse` - Establishes an SSE connection for MCP clients
- `POST /messages` - Handles messages from MCP clients (used internally by the SSE transport)
- `GET /health` - Returns the server's health status
- `GET /tools` - Returns a list of all available tools
- `POST /mcp` - Legacy JSON-RPC endpoint for direct MCP requests (not used with SSE transport)

## Available Resources

The SSE implementation includes rich resources for API documentation:

- `swagger://docs` - Main documentation resource with an overview of all available endpoints
- `swagger://{path}` - Detailed documentation for specific endpoints, where `{path}` is the API path

## Testing the Server

### Starting the Server

1. Clone the repository
2. Install dependencies: `npm install`
3. Start the server: `npm start`

The server will run on port 3500 by default.

### Creating a Test Client

You can test the server using an MCP client like Cline or by creating a simple test script:

```javascript
import { McpClient } from '@modelcontextprotocol/sdk/client/mcp.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

async function testMcpServer() {
  // Create an SSE client transport
  const transport = new SSEClientTransport('http://localhost:3500/sse');
  
  // Create the MCP client
  const client = new McpClient();
  
  // Connect to the server
  await client.connect(transport);
  
  try {
    // List all available tools
    const { tools } = await client.listTools();
    console.log(`Found ${tools.length} tools:`);
    tools.forEach(tool => console.log(`- ${tool.name}: ${tool.description}`));
    
    // Access a resource
    const docsResource = await client.getResource("swagger://docs");
    console.log("\nAPI Documentation:");
    console.log(docsResource.contents[0].text.substring(0, 500) + "...");
    
    // Execute a tool (assuming a tool named "get_api_LpcReport_id" exists)
    // Note: Replace with an actual tool name from your server
    if (tools.some(t => t.name === "get_api_LpcReport_id")) {
      const result = await client.callTool("get_api_LpcReport_id", { lpcId: "1" });
      console.log("\nTool execution result:");
      console.log(result.content[0].text);
    }
  } finally {
    // Disconnect from the server
    await client.disconnect();
  }
}

testMcpServer().catch(console.error);
```

Save this as `test-client.js` and run it with Node.js to test your server.

## Expected Functionality

When properly configured, the MCP server will:

1. Start up and load the Swagger specification
2. Generate tools for each API endpoint
3. Register resources for API documentation
4. Listen for SSE connections on the `/sse` endpoint
5. Handle incoming messages on the `/messages` endpoint
6. Track active client connections and clean up when they disconnect

Clients can connect to the server, list available tools, access resources, and execute tools all through the SSE transport.

## Troubleshooting

If you encounter issues:

1. Check that the server is running and accessible at the expected URL
2. Verify that the Swagger specification is loading correctly
3. Ensure the client is using the correct URL for the SSE endpoint
4. Check server logs for detailed error information
5. Verify that the client is using the correct transport type (SSE)

## Next Steps

- Implement authentication for the SSE connections if needed
- Add more sophisticated error handling for API errors
- Enhance the resource documentation with more examples
