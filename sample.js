import express from "express";
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import morgan from "morgan";
import winston from "winston";
import "winston-daily-rotate-file";

// Configure logging
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" })
  ],
});

// Create Express app
const app = express();
app.use(express.json());
app.use(morgan("dev"));

// Store SSE transports
const transports: Record<string, SSEServerTransport> = {};

// Create the MCP server for calculator functionality
const server = new McpServer({
  name: "Calculator",
  version: "1.0.0"
});

// Add basic calculator operations as tools
server.tool(
  "add",
  {
    a: z.number().describe("First number to add"),
    b: z.number().describe("Second number to add")
  },
  async ({ a, b }) => ({
    content: [{ type: "text", text: String(a + b) }]
  })
);

server.tool(
  "subtract",
  {
    a: z.number().describe("Number to subtract from"),
    b: z.number().describe("Number to subtract")
  },
  async ({ a, b }) => ({
    content: [{ type: "text", text: String(a - b) }]
  })
);

server.tool(
  "multiply",
  {
    a: z.number().describe("First number to multiply"),
    b: z.number().describe("Second number to multiply")
  },
  async ({ a, b }) => ({
    content: [{ type: "text", text: String(a * b) }]
  })
);

server.tool(
  "divide",
  {
    a: z.number().describe("Dividend (number to be divided)"),
    b: z.number().describe("Divisor (number to divide by)")
  },
  async ({ a, b }) => {
    if (b === 0) {
      return {
        content: [{ type: "text", text: "Error: Division by zero" }],
        isError: true
      };
    }
    return {
      content: [{ type: "text", text: String(a / b) }]
    };
  }
);

// Add a calculator info resource
server.resource(
  "calculator-info",
  "calculator://info",
  async (uri) => ({
    contents: [{
      uri: uri.href,
      text: `
# Calculator MCP Server

This server provides basic calculator functionality through the Model Context Protocol.

## Available Operations

- add: Add two numbers
- subtract: Subtract second number from first
- multiply: Multiply two numbers
- divide: Divide first number by second

## Usage

Use these tools through any MCP client that supports the calculator:// protocol.
      `
    }]
  })
);

// Add a dynamic operation resource
server.resource(
  "operation-info",
  new ResourceTemplate("calculator://{operation}", { list: undefined }),
  async (uri, { operation }) => {
    let text;

    switch (operation) {
      case "add":
        text = "Addition operation: Adds two numbers together (a + b)";
        break;
      case "subtract":
        text = "Subtraction operation: Subtracts second number from first (a - b)";
        break;
      case "multiply":
        text = "Multiplication operation: Multiplies two numbers (a * b)";
        break;
      case "divide":
        text = "Division operation: Divides first number by second (a / b)";
        break;
      default:
        text = `Unknown operation: ${operation}`;
    }

    return {
      contents: [{
        uri: uri.href,
        text
      }]
    };
  }
);

// Set up the SSE endpoint to establish client connections
app.get('/sse', async (req, res) => {
  logger.info("New SSE connection request received");

  const transport = new SSEServerTransport('/messages', res);
  transports[transport.sessionId] = transport;

  logger.info(`Created new SSE transport with ID: ${transport.sessionId}`);

  // Remove transport when connection closes
  res.on("close", () => {
    logger.info(`SSE connection closed for ID: ${transport.sessionId}`);
    delete transports[transport.sessionId];
  });

  // Connect the transport to the server
  await server.connect(transport);
});

// Handle messages from clients
app.post('/messages', async (req, res) => {
  const sessionId = req.query.sessionId as string;
  logger.info(`Received message for session: ${sessionId}`);

  const transport = transports[sessionId];
  if (transport) {
    await transport.handlePostMessage(req, res, req.body);
  } else {
    logger.error(`No transport found for sessionId: ${sessionId}`);
    res.status(400).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: "Invalid or missing session ID",
      },
      id: null
    });
  }
});

// Add health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    serviceName: "Calculator MCP Server",
    version: "1.0.0",
    activeConnections: Object.keys(transports).length
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`MCP Calculator Server running on port ${PORT}`);
  console.log(`MCP Calculator Server running on port ${PORT}`);
});
