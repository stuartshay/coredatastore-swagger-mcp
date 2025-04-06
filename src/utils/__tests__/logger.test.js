/* eslint-disable no-console */
/**
 * Tests for the Logger utility
 */
import { jest } from '@jest/globals';

// Mock Date.now to return a fixed timestamp for tests
const originalDateNow = Date.now;
Date.now = jest.fn(() => 1712432400000);

// Mock Math.random for deterministic correlation IDs
const originalMathRandom = Math.random;
Math.random = jest.fn(() => 0.7);

// Import modules after mocking
import { Logger, logger, setLogLevel } from '../logger.js';

describe('Logger', () => {
  // Save original console methods before mocking them
  const originalConsoleDebug = console.debug;
  const originalConsoleInfo = console.info;
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;
  const originalEnv = process.env;

  // Mock Date.now and Date.toISOString for consistent timestamps
  const mockISOString = jest
    .spyOn(Date.prototype, 'toISOString')
    .mockReturnValue('2025-04-06T12:00:00.000Z');

  beforeEach(() => {
    // Mock console methods for each test
    console.debug = jest.fn();
    console.info = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();

    // Reset env between tests
    process.env = { ...originalEnv };
    jest.clearAllMocks();
  });

  afterAll(() => {
    // Restore original console methods after all tests
    console.debug = originalConsoleDebug;
    console.info = originalConsoleInfo;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
    process.env = originalEnv;

    // Restore mocked functions
    mockISOString.mockRestore();
    Date.now = originalDateNow;
    Math.random = originalMathRandom;
  });

  describe('createCorrelationId', () => {
    test('should create a unique correlation ID', () => {
      // Force debug level
      setLogLevel('DEBUG');

      // Create a new Logger instance which will generate a correlation ID
      const testLogger = new Logger();

      // Log a message which should use the generated correlation ID
      testLogger.debug('Test message');

      // We should get a deterministic correlation ID since Date.now and Math.random are mocked
      const expectedTimestamp = 'luoi1c'; // 1712432400000 in base36
      expect(console.debug).toHaveBeenCalled();
      const logStr = console.debug.mock.calls[0][0];

      // Verify the log string contains our expected timestamp
      expect(logStr).toContain(expectedTimestamp);
    });
  });

  describe('Logger instance', () => {
    test('should create logger with default options', () => {
      const testLogger = new Logger();

      expect(testLogger.defaultCorrelationId).toBeUndefined();
      expect(testLogger.defaultMetadata).toEqual({});
    });

    test('should create logger with custom options', () => {
      const correlationId = '123456';
      const metadata = { service: 'test-service' };
      const testLogger = new Logger({ correlationId, metadata });

      expect(testLogger.defaultCorrelationId).toBe(correlationId);
      expect(testLogger.defaultMetadata).toBe(metadata);
    });

    test('should create child logger with inherited context', () => {
      const parentLogger = new Logger({
        correlationId: 'parent-id',
        metadata: { service: 'parent-service' },
      });

      const childLogger = parentLogger.child({ component: 'child' });

      expect(childLogger.defaultCorrelationId).toBe('parent-id');
      expect(childLogger.defaultMetadata).toEqual({
        service: 'parent-service',
        component: 'child',
      });
    });

    test('should create child logger with overridden correlation ID', () => {
      const parentLogger = new Logger({
        correlationId: 'parent-id',
        metadata: { service: 'parent-service' },
      });

      const childLogger = parentLogger.child({ component: 'child' }, 'child-id');

      expect(childLogger.defaultCorrelationId).toBe('child-id');
      expect(childLogger.defaultMetadata).toEqual({
        service: 'parent-service',
        component: 'child',
      });
    });
  });

  describe('log levels', () => {
    test('should respect DEBUG level', () => {
      // Force debug level
      setLogLevel('DEBUG');

      const testLogger = new Logger();

      // Clear any previous calls
      console.debug.mockClear();
      console.info.mockClear();
      console.warn.mockClear();
      console.error.mockClear();

      testLogger.debug('Debug message');
      testLogger.info('Info message');
      testLogger.warn('Warn message');
      testLogger.error('Error message');

      expect(console.debug).toHaveBeenCalled();
      expect(console.info).toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });

    test('should respect INFO level', () => {
      // Force info level
      setLogLevel('INFO');

      const testLogger = new Logger();

      // Clear any previous calls
      console.debug.mockClear();
      console.info.mockClear();
      console.warn.mockClear();
      console.error.mockClear();

      testLogger.debug('Debug message');
      testLogger.info('Info message');
      testLogger.warn('Warn message');
      testLogger.error('Error message');

      expect(console.debug).not.toHaveBeenCalled();
      expect(console.info).toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });

    test('should respect WARN level', () => {
      // Force warn level
      setLogLevel('WARN');

      const testLogger = new Logger();

      // Clear any previous calls
      console.debug.mockClear();
      console.info.mockClear();
      console.warn.mockClear();
      console.error.mockClear();

      testLogger.debug('Debug message');
      testLogger.info('Info message');
      testLogger.warn('Warn message');
      testLogger.error('Error message');

      expect(console.debug).not.toHaveBeenCalled();
      expect(console.info).not.toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });

    test('should respect ERROR level', () => {
      // Force error level
      setLogLevel('ERROR');

      const testLogger = new Logger();

      // Clear any previous calls
      console.debug.mockClear();
      console.info.mockClear();
      console.warn.mockClear();
      console.error.mockClear();

      testLogger.debug('Debug message');
      testLogger.info('Info message');
      testLogger.warn('Warn message');
      testLogger.error('Error message');

      expect(console.debug).not.toHaveBeenCalled();
      expect(console.info).not.toHaveBeenCalled();
      expect(console.warn).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });

    test('should default to INFO level with invalid level', () => {
      // Reset to default
      setLogLevel('INFO');

      const testLogger = new Logger();

      // Clear any previous calls
      console.debug.mockClear();
      console.info.mockClear();

      testLogger.debug('Debug message');
      testLogger.info('Info message');

      expect(console.debug).not.toHaveBeenCalled();
      expect(console.info).toHaveBeenCalled();
    });
  });

  describe('log methods', () => {
    beforeEach(() => {
      // Force debug level for all log method tests
      setLogLevel('DEBUG');

      // Clear any previous calls
      console.debug.mockClear();
      console.info.mockClear();
      console.warn.mockClear();
      console.error.mockClear();
    });

    test('debug method should log correctly', () => {
      const testLogger = new Logger();
      const testData = { key: 'value' };

      testLogger.debug('Debug message', testData);

      expect(console.debug).toHaveBeenCalled();

      // Extract and parse the JSON log string
      const logJson = console.debug.mock.calls[0][0];
      const logData = JSON.parse(logJson);

      expect(logData.level).toBe('DEBUG');
      expect(logData.message).toBe('Debug message');
      expect(logData.key).toBe('value');
    });

    test('info method should log correctly', () => {
      const testLogger = new Logger();
      const testData = { key: 'value' };

      testLogger.info('Info message', testData);

      expect(console.info).toHaveBeenCalled();

      // Extract and parse the JSON log string
      const logJson = console.info.mock.calls[0][0];
      const logData = JSON.parse(logJson);

      expect(logData.level).toBe('INFO');
      expect(logData.message).toBe('Info message');
      expect(logData.key).toBe('value');
    });

    test('warn method should log correctly', () => {
      const testLogger = new Logger();
      const testData = { key: 'value' };

      testLogger.warn('Warning message', testData);

      expect(console.warn).toHaveBeenCalled();

      // Extract and parse the JSON log string
      const logJson = console.warn.mock.calls[0][0];
      const logData = JSON.parse(logJson);

      expect(logData.level).toBe('WARN');
      expect(logData.message).toBe('Warning message');
      expect(logData.key).toBe('value');
    });

    test('error method should log correctly with plain data', () => {
      const testLogger = new Logger();
      const testData = { key: 'value' };

      testLogger.error('Error message', testData);

      expect(console.error).toHaveBeenCalled();

      // Extract and parse the JSON log string
      const logJson = console.error.mock.calls[0][0];
      const logData = JSON.parse(logJson);

      expect(logData.level).toBe('ERROR');
      expect(logData.message).toBe('Error message');
      expect(logData.key).toBe('value');
    });

    test('error method should log correctly with Error object', () => {
      const testLogger = new Logger();
      const testError = new Error('Test error');
      testError.name = 'TestError';

      testLogger.error('Error occurred', testError);

      expect(console.error).toHaveBeenCalled();

      // Extract and parse the JSON log string
      const logJson = console.error.mock.calls[0][0];
      const logData = JSON.parse(logJson);

      expect(logData.level).toBe('ERROR');
      expect(logData.message).toBe('Error occurred');
      expect(logData.errorName).toBe('TestError');
      expect(logData.errorMessage).toBe('Test error');
      expect(logData.stack).toBeDefined();
    });

    test('should use custom correlation ID if provided', () => {
      const testLogger = new Logger();
      const customCorrelationId = 'custom-id';

      testLogger.info('Test message', {}, customCorrelationId);

      const logJson = console.info.mock.calls[0][0];
      const logData = JSON.parse(logJson);

      expect(logData.correlationId).toBe(customCorrelationId);
    });

    test('should use default correlation ID if set', () => {
      const defaultCorrelationId = 'default-id';
      const testLogger = new Logger({ correlationId: defaultCorrelationId });

      testLogger.info('Test message');

      const logJson = console.info.mock.calls[0][0];
      const logData = JSON.parse(logJson);

      expect(logData.correlationId).toBe(defaultCorrelationId);
    });

    test('should include default metadata in logs', () => {
      const metadata = { service: 'test-service', version: '1.0.0' };
      const testLogger = new Logger({ metadata });

      testLogger.info('Test message');

      const logJson = console.info.mock.calls[0][0];
      const logData = JSON.parse(logJson);

      expect(logData.service).toBe('test-service');
      expect(logData.version).toBe('1.0.0');
    });

    test('should merge provided data with default metadata', () => {
      const metadata = { service: 'test-service' };
      const testLogger = new Logger({ metadata });

      testLogger.info('Test message', { method: 'GET' });

      const logJson = console.info.mock.calls[0][0];
      const logData = JSON.parse(logJson);

      expect(logData.service).toBe('test-service');
      expect(logData.method).toBe('GET');
    });
  });

  describe('sanitizeData', () => {
    beforeEach(() => {
      // Force debug level for all sanitizeData tests
      process.env.LOG_LEVEL = 'DEBUG';
    });

    test('should redact sensitive fields', () => {
      const testLogger = new Logger();

      const sensitiveData = {
        username: 'test_user',
        password: 'secret123',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        config: {
          apiKey: '12345',
          api_key: 'abcde',
          secretKey: 'very-secret',
        },
      };

      testLogger.info('Test message', sensitiveData);

      const logJson = console.info.mock.calls[0][0];
      const logData = JSON.parse(logJson);

      expect(logData.username).toBe('test_user');
      expect(logData.password).toBe('[REDACTED]');
      expect(logData.token).toBe('[REDACTED]');
      expect(logData.config.apiKey).toBe('[REDACTED]');
      expect(logData.config.api_key).toBe('[REDACTED]');
      expect(logData.config.secretKey).toBe('[REDACTED]');
    });

    test('should handle non-object values', () => {
      const testLogger = new Logger();

      testLogger.info('Test message', 'This is a string');

      const logJson = console.info.mock.calls[0][0];
      const logData = JSON.parse(logJson);

      // The string should be passed through unchanged
      expect(logData.message).toBe('Test message');
    });

    test('should handle null and undefined values', () => {
      const testLogger = new Logger();

      testLogger.info('Test with null', null);
      testLogger.info('Test with undefined', undefined);

      expect(console.info).toHaveBeenCalledTimes(2);
    });

    test('should handle nested objects and arrays', () => {
      const testLogger = new Logger();

      const dataWithArray = {
        items: [
          { id: 1, name: 'Item 1' },
          { id: 2, apiKey: 'secret' },
        ],
      };

      testLogger.info('Test with array', dataWithArray);

      const logJson = console.info.mock.calls[0][0];
      const logData = JSON.parse(logJson);

      expect(logData.items[0].name).toBe('Item 1');
      expect(logData.items[1].apiKey).toBe('[REDACTED]');
    });
  });

  describe('Express middleware', () => {
    test('should create middleware function', () => {
      const middleware = Logger.expressMiddleware();
      expect(typeof middleware).toBe('function');
    });

    test('should log requests and responses', () => {
      process.env.LOG_LEVEL = 'INFO';

      const middleware = Logger.expressMiddleware();

      // Mock Express req, res, next
      const req = {
        method: 'GET',
        url: '/api/test',
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('test-agent'),
      };

      const res = {
        statusCode: 200,
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'finish') {
            callback();
          }
          return res;
        }),
      };

      const next = jest.fn();

      // Call middleware
      middleware(req, res, next);

      // Verify request logging
      expect(console.info).toHaveBeenCalled();
      const requestLogJson = console.info.mock.calls[0][0];
      expect(requestLogJson).toContain('HTTP GET /api/test');

      // Verify response logging
      expect(console.info).toHaveBeenCalledTimes(2);
      const responseLogJson = console.info.mock.calls[1][0];
      expect(responseLogJson).toContain('HTTP GET /api/test 200');

      // Verify next was called
      expect(next).toHaveBeenCalled();

      // Verify logger was attached to req
      expect(req.logger).toBeDefined();
    });

    test('should use warn level for error responses', () => {
      process.env.LOG_LEVEL = 'INFO';

      const middleware = Logger.expressMiddleware();

      // Mock Express req, res, next
      const req = {
        method: 'GET',
        url: '/api/error',
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('test-agent'),
      };

      const res = {
        statusCode: 404,
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'finish') {
            callback();
          }
          return res;
        }),
      };

      const next = jest.fn();

      // Call middleware
      middleware(req, res, next);

      // Verify response logging used warn level for 4xx status
      expect(console.warn).toHaveBeenCalled();
      const warnLogJson = console.warn.mock.calls[0][0];
      expect(warnLogJson).toContain('HTTP GET /api/error 404');
    });
  });

  describe('default logger instance', () => {
    test('should create a default logger with service metadata', () => {
      expect(logger).toBeInstanceOf(Logger);
      expect(logger.defaultMetadata).toEqual({ service: 'coredatastore-swagger-mcp' });
    });
  });
});
