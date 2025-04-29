// filepath: /home/vagrant/git/coredatastore-swagger-mcp/src/__tests__/server.test.js
import { jest } from '@jest/globals';

// Setup mocks
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
    handlePostMessage: jest.fn(),
  })),
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
  const mockExpress = jest.fn().mockReturnValue(mockApp);
  mockExpress.json = jest.fn().mockReturnValue(jest.fn());
  return {
    default: mockExpress,
  };
});

jest.unstable_mockModule('node-fetch', () => ({
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
              },
            },
          },
          components: {
            schemas: {},
          },
        }),
    })
  ),
}));

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

// Mock process.exit to prevent tests from exiting
const originalExit = process.exit;
process.exit = jest.fn();

// Mock console.error to reduce noise in tests
console.error = jest.fn();

describe('SwaggerMCPServer with SSE Transport', () => {
  let SwaggerMCPServer;
  let server;
  // We'll still import these but not check directly since we're using unstable_mockModule
  let SSEServerTransport;

  beforeAll(async () => {
    // Import the module after mocking
    const indexModule = await import('../index.js');
    SwaggerMCPServer = indexModule.SwaggerMCPServer;

    // Import the mocked SSE transport
    const sseModule = await import('@modelcontextprotocol/sdk/server/sse.js');
    SSEServerTransport = sseModule.SSEServerTransport;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    server = new SwaggerMCPServer();
  });

  afterAll(() => {
    process.exit = originalExit;
  });

  test('constructor initializes McpServer and transports hash', () => {
    // Since we can't directly test if McpServer was called (it's not a mock anymore)
    // Let's verify server is initialized correctly
    expect(server.server).toBeDefined();
    expect(server.transports).toEqual({});
  });

  test('setupSSEEndpoints configures SSE endpoints correctly', () => {
    server.setupSSEEndpoints();

    // Verify that the SSE endpoints were set up
    expect(server.app.get).toHaveBeenCalledWith('/sse', expect.any(Function));
    expect(server.app.post).toHaveBeenCalledWith('/messages', expect.any(Function));
  });

  test('run calls init and setupSSEEndpoints', async () => {
    // Mock dependencies
    jest.spyOn(server, 'init').mockResolvedValue();
    jest.spyOn(server, 'setupSSEEndpoints').mockImplementation();

    // Call the method
    await server.run();

    // Verify the call sequence
    expect(server.init).toHaveBeenCalled();
    expect(server.setupSSEEndpoints).toHaveBeenCalled();
  });
});
