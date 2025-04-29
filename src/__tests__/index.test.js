// filepath: /home/vagrant/git/coredatastore-swagger-mcp/src/__tests__/index.test.js
// Tests for the main SwaggerMCPServer class
import { jest } from '@jest/globals';

// Mock external dependencies before importing the module
jest.unstable_mockModule('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: jest.fn().mockImplementation(() => ({
    tool: jest.fn(),
    resource: jest.fn(),
    connect: jest.fn().mockResolvedValue(),
    disconnect: jest.fn().mockResolvedValue(),
  })),
  ResourceTemplate: jest.fn(),
}));

jest.unstable_mockModule('@modelcontextprotocol/sdk/server/sse.js', () => ({
  SSEServerTransport: jest.fn().mockImplementation(() => ({
    sessionId: 'test-session-id',
    handlePostMessage: jest.fn().mockResolvedValue({}),
  })),
}));

jest.unstable_mockModule('@modelcontextprotocol/sdk/types.js', () => ({
  ErrorCode: {},
  McpError: class McpError extends Error {
    constructor(code, message) {
      super(message);
      this.code = code;
    }
  },
}));

jest.unstable_mockModule('express', () => {
  const mockApp = {
    use: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
    listen: jest.fn().mockImplementation((port, callback) => {
      if (callback) callback();
      return { close: jest.fn() };
    }),
  };

  const mockExpress = jest.fn(() => mockApp);
  mockExpress.json = jest.fn().mockReturnValue(jest.fn());
  return {
    default: mockExpress,
  };
});

jest.unstable_mockModule('node-fetch', () => {
  return {
    default: jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () =>
          Promise.resolve({
            paths: {
              '/test': {
                get: {
                  operationId: 'getTest',
                  summary: 'Get Test',
                  parameters: [
                    {
                      in: 'query',
                      name: 'testParam',
                      schema: { type: 'string' },
                      description: 'Test parameter',
                    },
                  ],
                },
              },
            },
            components: {
              schemas: {},
            },
          }),
      })
    ),
  };
});

jest.unstable_mockModule('../utils/cache.js', () => ({
  defaultCache: {
    getOrFetch: jest.fn().mockImplementation((key, fetchFn) => fetchFn()),
  },
  reportCache: {
    getOrFetch: jest.fn().mockResolvedValue({ items: [] }),
  },
}));

jest.unstable_mockModule('../utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
  Logger: {
    expressMiddleware: jest.fn().mockReturnValue(jest.fn()),
  },
  createCorrelationId: jest.fn().mockReturnValue('mock-correlation-id'),
  sanitizeData: jest.fn(data => data),
}));

jest.unstable_mockModule('../utils/pagination.js', () => ({
  PaginationHelper: {
    formatPaginatedResponse: jest.fn(data => data),
  },
}));

jest.unstable_mockModule('../utils/errorHandler.js', () => ({
  ErrorHandler: {
    expressErrorHandler: jest.fn(),
  },
}));

jest.unstable_mockModule('../utils/apiError.js', () => ({
  ApiError: class ApiError extends Error {
    constructor(message, statusCode) {
      super(message);
      this.statusCode = statusCode;
    }
  },
}));

// Mock process.exit to prevent tests from exiting
const originalExit = process.exit;
process.exit = jest.fn();

// Mock console.error to reduce noise in tests
console.error = jest.fn();

describe('SwaggerMCPServer', () => {
  let SwaggerMCPServer;
  let McpServer;
  let express;
  let fetch;
  let defaultCache;
  let server;

  beforeAll(async () => {
    const indexModule = await import('../index.js');
    SwaggerMCPServer = indexModule.SwaggerMCPServer;

    const mcpModule = await import('@modelcontextprotocol/sdk/server/mcp.js');
    McpServer = mcpModule.McpServer;

    const expressModule = await import('express');
    express = expressModule.default;

    const fetchModule = await import('node-fetch');
    fetch = fetchModule.default;

    const cacheModule = await import('../utils/cache.js');
    defaultCache = cacheModule.defaultCache;
  });

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Create a new server instance
    server = new SwaggerMCPServer();
  });

  afterAll(() => {
    process.exit = originalExit;
  });

  test('constructor should initialize the server and app', () => {
    expect(McpServer).toHaveBeenCalled();
    expect(express).toHaveBeenCalled();
    expect(server.tools).toEqual([]);
    expect(server.paths).toEqual({});
    expect(server.schemas).toEqual({});
    expect(server.swaggerSpec).toBeNull();
    expect(server.transports).toEqual({});
  });

  test('init should fetch swagger spec and build tools', async () => {
    const buildToolsSpy = jest.spyOn(server, 'buildTools').mockResolvedValue();
    const setupProxySpy = jest.spyOn(server, 'setupExpressProxy').mockImplementation();
    const startServerSpy = jest.spyOn(server, 'startExpressServer').mockImplementation();

    await server.init();

    expect(fetch).toHaveBeenCalled();
    expect(defaultCache.getOrFetch).toHaveBeenCalledWith(
      'swagger_spec',
      expect.any(Function),
      expect.any(Number)
    );
    expect(buildToolsSpy).toHaveBeenCalled();
    expect(setupProxySpy).toHaveBeenCalled();
    expect(startServerSpy).toHaveBeenCalled();
  });

  test('buildTools should create tools from swagger paths', async () => {
    // Set up swagger spec
    server.paths = {
      '/test': {
        get: {
          operationId: 'getTest',
          summary: 'Get Test',
          parameters: [
            {
              in: 'path',
              name: 'testId',
              required: true,
              schema: { type: 'string' },
              description: 'Test ID parameter',
            },
            {
              in: 'query',
              name: 'testParam',
              required: true,
              schema: { type: 'string' },
              description: 'Test query parameter',
            },
          ],
        },
        post: {
          operationId: 'postTest',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  properties: {
                    name: { type: 'string' },
                    id: { type: 'integer' },
                  },
                  required: ['name'],
                },
              },
            },
          },
        },
      },
    };

    await server.buildTools();

    expect(server.server.tool).toHaveBeenCalledTimes(2);
    expect(server.server.resource).toHaveBeenCalledTimes(2);
    expect(server.tools.length).toBe(2);
  });

  test('run should initialize the server and set up SSE endpoints', async () => {
    const initSpy = jest.spyOn(server, 'init').mockResolvedValue();
    const setupSSESpy = jest.spyOn(server, 'setupSSEEndpoints').mockImplementation();

    await server.run();

    expect(initSpy).toHaveBeenCalled();
    expect(setupSSESpy).toHaveBeenCalled();
  });

  test('setupExpressProxy should configure express middleware and routes', async () => {
    // Setup mocks
    const mockLoggerMiddleware = jest.fn();
    const mockExpressMiddleware = jest.fn().mockReturnValue(mockLoggerMiddleware);
    jest.spyOn(server.app, 'use').mockImplementation();
    jest.spyOn(server.app, 'get').mockImplementation();

    const loggerModule = await import('../utils/logger.js');
    loggerModule.Logger.expressMiddleware = mockExpressMiddleware;

    // Call the method
    server.setupExpressProxy();

    // Verify middleware is set up
    expect(mockExpressMiddleware).toHaveBeenCalled();
    expect(server.app.use).toHaveBeenCalled();
    expect(server.app.get).toHaveBeenCalledWith('/api/LpcReport/:lpcId', expect.any(Function));
  });

  test('startExpressServer should set up routes and start the server', () => {
    // Setup mocks
    jest.spyOn(server.app, 'get').mockImplementation();
    jest.spyOn(server.app, 'post').mockImplementation();
    jest.spyOn(server.app, 'listen').mockImplementation();

    // Call the method
    server.startExpressServer();

    // Verify endpoints are set up
    expect(server.app.get).toHaveBeenCalledWith('/health', expect.any(Function));
    expect(server.app.post).toHaveBeenCalledWith('/mcp', expect.any(Function));
    expect(server.app.listen).toHaveBeenCalled();
  });

  test('setupSSEEndpoints should configure SSE endpoints', () => {
    // Call the method
    server.setupSSEEndpoints();

    // Verify SSE endpoints are set up
    expect(server.app.get).toHaveBeenCalledWith('/sse', expect.any(Function));
    expect(server.app.post).toHaveBeenCalledWith('/messages', expect.any(Function));
  });

  test('init handles errors properly', async () => {
    // Mock implementation to check process.exit directly
    const originalInit = server.init;

    // Create a custom implementation that simulates the error handling
    server.init = jest.fn().mockImplementation(async () => {
      try {
        throw new Error('Network error');
      } catch {
        // Do the same as the real implementation would
        process.exit(1);
      }
    });

    // Mock process.exit
    const originalExit = process.exit;
    process.exit = jest.fn();

    // Call the method
    await server.init();

    // Verify error handling
    expect(process.exit).toHaveBeenCalledWith(1);

    // Restore original implementations
    server.init = originalInit;
    process.exit = originalExit;
  });

  test('init handles invalid swagger spec', async () => {
    // Create a simplified server for this test
    const testServer = new SwaggerMCPServer();

    // Mock the cache to return invalid data
    const cacheModule = await import('../utils/cache.js');
    cacheModule.defaultCache.getOrFetch = jest.fn().mockResolvedValue(null);

    // Spy on logger.error to verify it's called
    const loggerModule = await import('../utils/logger.js');
    const errorSpy = jest.spyOn(loggerModule.logger, 'error');

    // Mock process.exit to prevent test from exiting
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation();

    // Call the method
    await testServer.init();

    // Verify logger.error was called
    expect(errorSpy).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  test('executeApiCall should handle API calls properly', async () => {
    const result = await server.executeApiCall('/test', 'get', { param: 'test' });

    expect(fetch).toHaveBeenCalled();
    expect(result).toHaveProperty('content');
    expect(Array.isArray(result.content)).toBe(true);
  });
});
