#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import fetch from 'node-fetch';
import express from 'express';
import { ErrorHandler } from './utils/errorHandler.js';
import { logger, Logger } from './utils/logger.js';
import { defaultCache, reportCache } from './utils/cache.js';
import { PaginationHelper } from './utils/pagination.js';
import { ApiError } from './utils/apiError.js';

// Default configuration
const DEFAULT_PORT = 3500;
const SWAGGER_URL =
  process.env.SWAGGER_URL || 'https://api.coredatastore.com/swagger/v1/swagger.json';
const API_PORT = process.env.PORT || DEFAULT_PORT;
const API_BASE_URL = process.env.API_BASE_URL || 'https://api.coredatastore.com';

// Export the class for testing purposes
export class SwaggerMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'coredatastore-swagger-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.tools = [];
    this.paths = {};
    this.schemas = {};
    this.swaggerSpec = null;

    // Create Express server for local API queries
    this.app = express();
    this.app.use(express.json());

    // Setup MCP handlers
    this.setupHandlers();

    // Error handling
    this.server.onerror = error => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async init() {
    try {
      logger.info(`Fetching Swagger specification from: ${SWAGGER_URL}`);

      // Use cache for the Swagger specification to improve startup time
      const fetchSwagger = async () => {
        const response = await fetch(SWAGGER_URL);
        return await response.json();
      };

      // Cache the swagger spec for 1 hour
      this.swaggerSpec = await defaultCache.getOrFetch(
        'swagger_spec',
        fetchSwagger,
        60 * 60 * 1000
      );

      if (!this.swaggerSpec || !this.swaggerSpec.paths) {
        throw new Error('Invalid Swagger specification');
      }

      this.paths = this.swaggerSpec.paths;
      this.schemas = this.swaggerSpec.components?.schemas || {};

      // Parse the specification and build tools
      await this.buildTools();

      // Setup proxy endpoints in Express after we have swagger spec
      this.setupExpressProxy();

      logger.info(`Successfully loaded specification with ${Object.keys(this.paths).length} paths`);
      logger.info(`API Server listening on port ${API_PORT}`);

      // Start the Express server
      this.startExpressServer();
    } catch (error) {
      logger.error('Error initializing:', error);
      process.exit(1);
    }
  }

  setupExpressProxy() {
    // Add logging middleware - this should be correctly typed as it's implemented in logger.js
    const loggerMiddleware = Logger.expressMiddleware();
    this.app.use(loggerMiddleware);

    // Add error handling middleware at the end of the middleware chain
    this.app.use((err, req, res, next) => {
      ErrorHandler.expressErrorHandler(err, req, res, next);
    });

    // Add a proxy middleware for specific API endpoints
    // Instead of using a wildcard route pattern that might cause path-to-regexp errors

    // Add a specific route for LP reports by ID
    this.app.get('/api/LpcReport/:lpcId', async (req, res, next) => {
      try {
        const lpcId = req.params.lpcId;
        const targetUrl = `${API_BASE_URL}/api/LpcReport/${lpcId}`;
        const cacheKey = `report_${lpcId}`;

        // Use report cache with 10 minute expiry
        const data = await reportCache.getOrFetch(cacheKey, async () => {
          logger.info(`Proxying request to: GET ${targetUrl}`);

          const response = await fetch(targetUrl, {
            headers: {
              Accept: 'application/json',
            },
          });

          if (!response.ok) {
            throw new ApiError(
              `API responded with ${response.status}: ${response.statusText}`,
              response.status
            );
          }

          return await response.json();
        });

        // Format response for possible pagination
        const formattedResponse = PaginationHelper.formatPaginatedResponse(data);
        res.json(formattedResponse);
      } catch (error) {
        next(error); // Pass to error handler middleware
      }
    });

    // Add generic fallback proxy for other routes
    this.app.use('/api', (req, res) => {
      res.status(404).json({
        error: 'Endpoint not configured in proxy',
        message: "This endpoint hasn't been explicitly configured in the swagger-mcp proxy",
      });
    });
  }

  setupHandlers() {
    // Handle tool listing requests
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.tools,
      };
    });

    // Handle tool call requests
    this.server.setRequestHandler(CallToolRequestSchema, async request => {
      const { name, arguments: args } = request.params;

      try {
        // Find the tool definition
        const tool = this.tools.find(t => t.name === name);

        if (!tool) {
          throw new McpError(ErrorCode.MethodNotFound, `Tool not found: ${name}`);
        }

        // Get path and method from tool metadata
        const path = tool.metadata?.path;
        const method = tool.metadata?.method;

        if (!path || !method) {
          throw new McpError(ErrorCode.InternalError, `Invalid tool metadata for: ${name}`);
        }

        // Prepare URL with path parameters
        let url = `${API_BASE_URL}${path}`;

        // Replace path parameters with values from arguments
        if (args) {
          Object.keys(args).forEach(key => {
            // Convert parameter value to string to ensure it can be used in URL
            const paramValue = String(args[key] || '');
            url = url.replace(`{${key}}`, paramValue);
          });
        }

        // Add query parameters if method is GET
        if (method.toLowerCase() === 'get' && args) {
          const queryParams = new URLSearchParams();

          Object.keys(args).forEach(key => {
            // Only add if not a path parameter
            if (!path.includes(`{${key}}`)) {
              // Convert parameter value to string for query params
              queryParams.append(key, String(args[key] || ''));
            }
          });

          const queryString = queryParams.toString();
          if (queryString) {
            url += `?${queryString}`;
          }
        }

        console.error(`[SwaggerMCP] Executing API call: ${method} ${url}`);

        // Execute the API call
        const options = {
          method: method.toUpperCase(),
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        };

        // Add body for non-GET methods
        if (method.toLowerCase() !== 'get' && args) {
          const bodyArgs = {};

          // Filter out path parameters
          Object.keys(args).forEach(key => {
            if (!path.includes(`{${key}}`)) {
              bodyArgs[key] = args[key];
            }
          });

          if (Object.keys(bodyArgs).length > 0) {
            options.body = JSON.stringify(bodyArgs);
          }
        }

        // Make the API call
        const response = await fetch(url, options);
        const responseData = await response.json();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(responseData, null, 2),
            },
          ],
        };
      } catch (error) {
        console.error(`[SwaggerMCP] Error executing tool ${name}:`, error);

        return {
          content: [
            {
              type: 'text',
              text: `Error executing API call: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async buildTools() {
    const tools = [];

    // Process each path and method in the Swagger spec
    for (const [path, pathItem] of Object.entries(this.paths)) {
      for (const [method, operation] of Object.entries(pathItem)) {
        // Skip non-HTTP methods
        if (!['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
          continue;
        }

        // Create a tool name based on operation ID or path
        const operationId =
          operation.operationId || `${method}_${path.replace(/\//g, '_').replace(/[{}]/g, '')}`;

        // Create an input schema based on parameters and request body
        const properties = {};
        const required = [];

        // Process path parameters
        if (operation.parameters) {
          operation.parameters.forEach(param => {
            if (param.in === 'path') {
              properties[param.name] = {
                type: param.schema?.type || 'string',
                description: param.description || `${param.name} parameter`,
              };

              if (param.required) {
                required.push(param.name);
              }
            } else if (param.in === 'query') {
              properties[param.name] = {
                type: param.schema?.type || 'string',
                description: param.description || `${param.name} query parameter`,
              };

              if (param.required) {
                required.push(param.name);
              }
            }
          });
        }

        // Process request body
        if (operation.requestBody) {
          const content = operation.requestBody.content;

          if (content && content['application/json']) {
            const schema = content['application/json'].schema;

            if (schema.properties) {
              // Add body properties to the input schema
              Object.entries(schema.properties).forEach(([propName, propSchema]) => {
                properties[propName] = {
                  type: propSchema.type || 'string',
                  description: propSchema.description || propName,
                };
              });

              // Add required properties
              if (schema.required) {
                schema.required.forEach(prop => {
                  if (!required.includes(prop)) {
                    required.push(prop);
                  }
                });
              }
            }
          }
        }

        // Create the tool
        const tool = {
          name: operationId,
          description:
            operation.summary || operation.description || `${method.toUpperCase()} ${path}`,
          inputSchema: {
            type: 'object',
            properties,
            required,
          },
          metadata: {
            path,
            method,
            tags: operation.tags || [],
          },
        };

        tools.push(tool);
      }
    }

    this.tools = tools;
    console.error(`[SwaggerMCP] Created ${tools.length} tools from Swagger specification`);
  }

  startExpressServer() {
    // Simple health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ status: 'OK', tools: this.tools.length });
    });

    // Create a dedicated MCP endpoint with a handler function
    this.app.post('/mcp', async (req, res) => {
      try {
        console.error('[SwaggerMCP] Received MCP request:', req.body);

        // Basic validation
        const { jsonrpc, method, params, id } = req.body;

        if (jsonrpc !== '2.0' || !method) {
          return res.status(400).json({
            jsonrpc: '2.0',
            error: {
              code: -32600,
              message: 'Invalid Request',
            },
            id: id || null,
          });
        }

        // Handle mcp.listTools
        if (method === 'mcp.listTools') {
          return res.json({
            jsonrpc: '2.0',
            result: { tools: this.tools },
            id,
          });
        }

        // Handle mcp.callTool
        if (method === 'mcp.callTool') {
          if (!params || !params.name) {
            return res.status(400).json({
              jsonrpc: '2.0',
              error: {
                code: -32602,
                message: 'Invalid params: missing tool name',
              },
              id,
            });
          }

          const tool = this.tools.find(t => t.name === params.name);
          if (!tool) {
            return res.json({
              jsonrpc: '2.0',
              error: {
                code: -32601,
                message: `Tool not found: ${params.name}`,
              },
              id,
            });
          }

          // Execute the tool call
          try {
            // Get path and method
            const path = tool.metadata?.path;
            const method = tool.metadata?.method;
            const toolArgs = params.arguments || {};

            if (!path || !method) {
              return res.json({
                jsonrpc: '2.0',
                error: {
                  code: -32000,
                  message: `Invalid tool metadata for: ${params.name}`,
                },
                id,
              });
            }

            // Build the URL
            let url = `${API_BASE_URL}${path}`;

            // Replace path parameters
            Object.keys(toolArgs).forEach(key => {
              url = url.replace(`{${key}}`, String(toolArgs[key] || ''));
            });

            // Add query params for GET
            if (method.toLowerCase() === 'get') {
              const queryParams = new URLSearchParams();
              Object.keys(toolArgs).forEach(key => {
                if (!path.includes(`{${key}}`)) {
                  queryParams.append(key, String(toolArgs[key] || ''));
                }
              });

              const queryString = queryParams.toString();
              if (queryString) {
                url += `?${queryString}`;
              }
            }

            // Setup request options
            const options = {
              method: method.toUpperCase(),
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
              },
            };

            // Add body for non-GET
            if (method.toLowerCase() !== 'get') {
              const bodyArgs = {};
              Object.keys(toolArgs).forEach(key => {
                if (!path.includes(`{${key}}`)) {
                  bodyArgs[key] = toolArgs[key];
                }
              });

              if (Object.keys(bodyArgs).length > 0) {
                options.body = JSON.stringify(bodyArgs);
              }
            }

            // Make the API call
            console.error(`[SwaggerMCP] Making API call: ${method} ${url}`);
            const response = await fetch(url, options);
            const responseData = await response.json();

            // Return formatted response
            return res.json({
              jsonrpc: '2.0',
              result: {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(responseData, null, 2),
                  },
                ],
              },
              id,
            });
          } catch (err) {
            console.error('[SwaggerMCP] Tool execution error:', err);
            return res.json({
              jsonrpc: '2.0',
              error: {
                code: -32000,
                message: err.message || 'Error executing tool',
              },
              id,
            });
          }
        }

        // Unsupported method
        return res.json({
          jsonrpc: '2.0',
          error: {
            code: -32601,
            message: `Method not found: ${method}`,
          },
          id,
        });
      } catch (error) {
        console.error('[SwaggerMCP] MCP request error:', error);
        return res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: error.message || 'Internal error',
          },
          id: req.body?.id || null,
        });
      }
    });

    // Start the server
    this.app.listen(API_PORT, () => {
      console.error(`[SwaggerMCP] API server is running on port ${API_PORT}`);
    });
  }

  // Connect to stdio in development mode
  async setupStdioTransport() {
    // In development or when running locally, also connect via stdio
    if (process.env.NODE_ENV !== 'production') {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.error('[SwaggerMCP] MCP server running on stdio');
    } else {
      console.error('[SwaggerMCP] MCP server endpoint available at /mcp');
    }
  }
}

// Add the run method directly in the class
SwaggerMCPServer.prototype.run = async function () {
  // Initialize the server first
  await this.init();

  // Connect to stdio if in development mode
  await this.setupStdioTransport();

  // Now server should be running
  console.error('[SwaggerMCP] Server is running');
};

// Start the server
const server = new SwaggerMCPServer();
server.run().catch(console.error);
