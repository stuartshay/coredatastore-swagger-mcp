#!/usr/bin/env node
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {} from '@modelcontextprotocol/sdk/types.js';
import fetch from 'node-fetch';
import express from 'express';
import { ErrorHandler } from './utils/errorHandler.js';
import { logger, Logger, createCorrelationId, sanitizeData } from './utils/logger.js';
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
    // Create McpServer instance
    this.server = new McpServer({
      name: 'coredatastore-swagger-mcp',
      version: '1.0.0',
    });

    // Initialize properties
    this.tools = [];
    this.paths = {};
    this.schemas = {};
    this.swaggerSpec = null;
    this.transports = {}; // Store SSE transports by sessionId

    // Create Express server for API queries and SSE connections
    this.app = express();
    this.app.use(express.json());

    // Error handling
    process.on('SIGINT', async () => {
      // Close all transports
      for (const sessionId in this.transports) {
        const transport = this.transports[sessionId];
        await this.server.disconnect(transport);
      }
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
    // Add logging middleware - ensure it's properly formatted for Express
    const loggerMiddlewareFunc = Logger.expressMiddleware();
    this.app.use((req, res, next) => {
      loggerMiddlewareFunc(req, res, next);
    });

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

  // Method to execute API calls for tools
  async executeApiCall(path, method, args, requestId = createCorrelationId()) {
    try {
      // Prepare URL with path parameters
      let url = `${API_BASE_URL}${path}`;

      // Replace path parameters with values from arguments
      if (args) {
        Object.keys(args).forEach(key => {
          if (path.includes(`{${key}}`)) {
            const paramValue = String(args[key] || '');
            url = url.replace(`{${key}}`, paramValue);
          }
        });
      }

      // Add query parameters if method is GET
      if (method.toLowerCase() === 'get' && args) {
        const queryParams = new URLSearchParams();

        Object.keys(args).forEach(key => {
          // Only add if not a path parameter
          if (!path.includes(`{${key}}`)) {
            queryParams.append(key, String(args[key] || ''));
          }
        });

        const queryString = queryParams.toString();
        if (queryString) {
          url += `?${queryString}`;
        }
      }

      logger.info(`API call: ${method} ${url}`, { requestId });

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
          logger.debug(`Request body`, {
            body: bodyArgs,
            requestId,
          });
        }
      }

      // Make the API call
      const startTime = Date.now();
      const response = await fetch(url, options);
      const duration = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`API responded with ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();

      logger.info(`API response: ${response.status}`, {
        statusCode: response.status,
        duration: `${duration}ms`,
        requestId,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(responseData, null, 2),
          },
        ],
      };
    } catch (error) {
      logger.error(`Error executing API call`, error, requestId);

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
  }

  async buildTools() {
    const createdTools = [];

    // First, register a resource for the Swagger documentation itself
    this.server.resource('swagger-documentation', 'swagger://docs', async uri => ({
      contents: [
        {
          uri: uri.href,
          text: `# CoreDataStore API Documentation\n\nThis MCP server provides access to the CoreDataStore API through tools generated from its Swagger specification.\n\n## Available Endpoints\n\nThe following endpoints are available as MCP tools:\n\n${Object.entries(
            this.paths
          )
            .map(([path, methods]) => {
              return `- ${path}\n  ${Object.entries(methods)
                .filter(([method]) => ['get', 'post', 'put', 'delete', 'patch'].includes(method))
                .map(
                  ([method, op]) =>
                    `  - ${method.toUpperCase()}: ${op.summary || op.description || 'No description'}`
                )
                .join('\n  ')}`;
            })
            .join('\n\n')}`,
        },
      ],
    }));

    // Then register a resource template for exploring specific endpoints
    this.server.resource(
      'endpoint-info',
      new ResourceTemplate('swagger://{path*}', { list: undefined }),
      async (uri, params) => {
        const path = params.path;
        const pathInfo = path.includes('/')
          ? this.paths['/' + path]
          : Object.entries(this.paths).find(([p]) => p.split('/')[1] === path)?.[1];

        if (!pathInfo) {
          return {
            contents: [
              {
                uri: uri.href,
                text: `# Unknown Path\n\nNo information available for path: ${path}`,
              },
            ],
          };
        }

        const methodsText = Object.entries(pathInfo)
          .filter(([method]) => ['get', 'post', 'put', 'delete', 'patch'].includes(method))
          .map(([method, op]) => {
            const paramsText = op.parameters
              ? '\n\n### Parameters\n' +
                op.parameters
                  .map(
                    p =>
                      `- \`${p.name}\` (${p.in}) ${p.required ? '(required)' : ''}: ${p.description || 'No description'}`
                  )
                  .join('\n')
              : '';

            return `## ${method.toUpperCase()}\n\n${op.summary || ''}\n\n${op.description || 'No detailed description available.'}${paramsText}`;
          })
          .join('\n\n---\n\n');

        return {
          contents: [
            {
              uri: uri.href,
              text: `# Path: ${path}\n\n${methodsText}`,
            },
          ],
        };
      }
    );

    // Process each path and method in the Swagger spec to create tools
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

        // Create tool input schema
        const inputSchema = {
          type: 'object',
          properties,
          required: required.length > 0 ? required : undefined,
        };

        // Register the tool with the McpServer
        this.server.tool(
          operationId,
          inputSchema,
          async args => {
            // Store the metadata to use in executeApiCall
            const metadata = {
              path,
              method,
              tags: operation.tags || [],
            };

            // Execute the API call using the metadata and args
            return await this.executeApiCall(path, method, args);
          },
          {
            description:
              operation.summary || operation.description || `${method.toUpperCase()} ${path}`,
          }
        );

        // Keep track of the tools for reference
        createdTools.push({
          name: operationId,
          description:
            operation.summary || operation.description || `${method.toUpperCase()} ${path}`,
          metadata: {
            path,
            method,
            tags: operation.tags || [],
          },
        });
      }
    }

    this.tools = createdTools;
    console.error(`[SwaggerMCP] Created ${createdTools.length} tools from Swagger specification`);
  }

  startExpressServer() {
    // Simple health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ status: 'OK', tools: this.tools.length });
    });

    // Add tools endpoint to expose available tools
    this.app.get('/tools', (req, res) => {
      res.json({ tools: this.tools });
    });

    // Create a dedicated MCP endpoint with a handler function
    this.app.post('/mcp', async (req, res) => {
      try {
        const requestId = createCorrelationId();
        logger.info('Received MCP request', {
          requestId,
          method: req.body?.method,
          params: req.body?.params ? sanitizeData(req.body.params) : null,
        });

        // Basic validation
        const { jsonrpc, method, params, id } = req.body;

        if (jsonrpc !== '2.0' || !method) {
          res.status(400).json({
            jsonrpc: '2.0',
            error: {
              code: -32600,
              message: 'Invalid Request',
            },
            id: id || null,
          });
          return;
        }

        // Handle mcp.listTools
        if (method === 'mcp.listTools') {
          res.json({
            jsonrpc: '2.0',
            result: { tools: this.tools },
            id,
          });
          return;
        }

        // Handle mcp.callTool
        if (method === 'mcp.callTool') {
          if (!params || !params.name) {
            res.status(400).json({
              jsonrpc: '2.0',
              error: {
                code: -32602,
                message: 'Invalid params: missing tool name',
              },
              id,
            });
            return;
          }

          const tool = this.tools.find(t => t.name === params.name);
          if (!tool) {
            res.json({
              jsonrpc: '2.0',
              error: {
                code: -32601,
                message: `Tool not found: ${params.name}`,
              },
              id,
            });
            return;
          }

          // Execute the tool call
          try {
            // Get path and method
            const path = tool.metadata?.path;
            const method = tool.metadata?.method;
            const toolArgs = params.arguments || {};

            if (!path || !method) {
              res.json({
                jsonrpc: '2.0',
                error: {
                  code: -32000,
                  message: `Invalid tool metadata for: ${params.name}`,
                },
                id,
              });
              return;
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
            res.json({
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
            return;
          } catch (err) {
            console.error('[SwaggerMCP] Tool execution error:', err);
            res.json({
              jsonrpc: '2.0',
              error: {
                code: -32000,
                message: err.message || 'Error executing tool',
              },
              id,
            });
            return;
          }
        }

        // Unsupported method
        res.json({
          jsonrpc: '2.0',
          error: {
            code: -32601,
            message: `Method not found: ${method}`,
          },
          id,
        });
      } catch (error) {
        console.error('[SwaggerMCP] MCP request error:', error);
        res.status(500).json({
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

  // Setup SSE endpoints for remote clients
  setupSSEEndpoints() {
    // Set up the SSE endpoint to establish client connections
    this.app.get('/sse', async (req, res) => {
      logger.info('New SSE connection request received');

      const transport = new SSEServerTransport('/messages', res);
      this.transports[transport.sessionId] = transport;

      logger.info(`Created new SSE transport with ID: ${transport.sessionId}`);

      // Remove transport when connection closes
      res.on('close', () => {
        logger.info(`SSE connection closed for ID: ${transport.sessionId}`);
        delete this.transports[transport.sessionId];
      });

      // Connect the transport to the server
      await this.server.connect(transport);
    });

    // Handle messages from clients
    this.app.post('/messages', async (req, res) => {
      const sessionId = req.query.sessionId;
      logger.info(`Received message for session: ${sessionId}`);

      const transport = this.transports[sessionId];
      if (transport) {
        await transport.handlePostMessage(req, res, req.body);
      } else {
        logger.error(`No transport found for sessionId: ${sessionId}`);
        res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Invalid or missing session ID',
          },
          id: null,
        });
      }
    });

    logger.info('SSE endpoints configured for remote client access');
  }
}

// Add the run method directly in the class
SwaggerMCPServer.prototype.run = async function () {
  // Initialize the server first
  await this.init();

  // Setup SSE endpoints for remote clients
  this.setupSSEEndpoints();

  // Now server should be running
  console.error('[SwaggerMCP] Server is running with SSE transport enabled');
};

// Start the server
const server = new SwaggerMCPServer();
server.run().catch(console.error);
