/**
 * Tests for the ErrorHandler utility
 */
import { jest } from '@jest/globals';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { ErrorHandler, generateRequestId } from '../errorHandler.js';

describe('ErrorHandler', () => {
  // Mock console.error to prevent test output noise
  beforeEach(() => {
    console.error = jest.fn();
  });

  describe('generateRequestId', () => {
    test('should generate a unique request ID', () => {
      const requestId = generateRequestId();
      expect(typeof requestId).toBe('string');
      expect(requestId.length).toBeGreaterThan(0);
    });
  });

  describe('mapHttpToMcpCode', () => {
    test('should map HTTP 400 to InvalidParams', () => {
      expect(ErrorHandler.mapHttpToMcpCode(400)).toBe(ErrorCode.InvalidParams);
    });

    test('should map HTTP 401 and 403 to InvalidRequest', () => {
      expect(ErrorHandler.mapHttpToMcpCode(401)).toBe(ErrorCode.InvalidRequest);
      expect(ErrorHandler.mapHttpToMcpCode(403)).toBe(ErrorCode.InvalidRequest);
    });

    test('should map HTTP 404 to InvalidRequest', () => {
      expect(ErrorHandler.mapHttpToMcpCode(404)).toBe(ErrorCode.InvalidRequest);
    });

    test('should map HTTP 408 and 504 to RequestTimeout', () => {
      expect(ErrorHandler.mapHttpToMcpCode(408)).toBe(ErrorCode.RequestTimeout);
      expect(ErrorHandler.mapHttpToMcpCode(504)).toBe(ErrorCode.RequestTimeout);
    });

    test('should map HTTP 429 to InvalidRequest', () => {
      expect(ErrorHandler.mapHttpToMcpCode(429)).toBe(ErrorCode.InvalidRequest);
    });

    test('should map HTTP 500, 502, and 503 to InternalError', () => {
      expect(ErrorHandler.mapHttpToMcpCode(500)).toBe(ErrorCode.InternalError);
      expect(ErrorHandler.mapHttpToMcpCode(502)).toBe(ErrorCode.InternalError);
      expect(ErrorHandler.mapHttpToMcpCode(503)).toBe(ErrorCode.InternalError);
    });

    test('should map unknown HTTP status codes to InternalError', () => {
      expect(ErrorHandler.mapHttpToMcpCode(418)).toBe(ErrorCode.InternalError); // I'm a teapot
      expect(ErrorHandler.mapHttpToMcpCode(599)).toBe(ErrorCode.InternalError);
    });
  });

  describe('formatApiError', () => {
    test('should format an API error with status and data', () => {
      const apiError = {
        status: 404,
        data: {
          message: 'Resource not found',
          detail: 'The requested resource could not be found',
        },
      };

      const formatted = ErrorHandler.formatApiError(apiError);
      expect(formatted.code).toBe(ErrorCode.InvalidRequest);
      expect(formatted.message).toBe('Resource not found');
      expect(formatted.details).toEqual({
        message: 'Resource not found',
        detail: 'The requested resource could not be found',
      });
      expect(typeof formatted.requestId).toBe('string');
      expect(typeof formatted.timestamp).toBe('string');
    });

    test('should handle API errors without data', () => {
      const apiError = {
        status: 500,
      };

      const formatted = ErrorHandler.formatApiError(apiError);
      expect(formatted.code).toBe(ErrorCode.InternalError);
      expect(formatted.message).toBe('API Error');
      expect(formatted.details).toEqual({});
      expect(typeof formatted.requestId).toBe('string');
      expect(typeof formatted.timestamp).toBe('string');
    });

    test('should handle API errors with unparseable data', () => {
      // Create an API error with data that will throw when trying to access it
      const apiError = {
        status: 500,
        data: undefined,
      };

      // Mock the try/catch error scenario
      console.error = jest.fn();

      const formatted = ErrorHandler.formatApiError(apiError);
      expect(formatted.code).toBe(ErrorCode.InternalError);
      expect(formatted.message).toBe('API Error');
      expect(formatted.details).toEqual({});
      expect(typeof formatted.requestId).toBe('string');
      expect(typeof formatted.timestamp).toBe('string');
    });
  });

  describe('formatValidationErrors', () => {
    test('should format validation errors', () => {
      const validationErrors = [
        {
          instancePath: '/name',
          message: 'should be string',
          keyword: 'type',
          params: { type: 'string' },
        },
        {
          instancePath: '/age',
          message: 'should be >= 0',
          keyword: 'minimum',
          params: { minimum: 0 },
        },
      ];

      const formatted = ErrorHandler.formatValidationErrors(validationErrors);
      expect(formatted.code).toBe(ErrorCode.InvalidParams);
      expect(formatted.message).toBe('Validation failed');
      expect(formatted.details.errors.length).toBe(2);
      expect(formatted.details.errors[0].path).toBe('/name');
      expect(formatted.details.errors[1].path).toBe('/age');
      expect(typeof formatted.requestId).toBe('string');
      expect(typeof formatted.timestamp).toBe('string');
    });
  });

  describe('createMcpErrorResponse', () => {
    test('should create an MCP error response from an API error', () => {
      const apiError = {
        status: 404,
        data: {
          message: 'Resource not found',
        },
      };

      const response = ErrorHandler.createMcpErrorResponse(apiError, true);
      expect(response.isError).toBe(true);
      expect(response.content.length).toBe(1);
      expect(response.content[0].type).toBe('text');

      const jsonText = response.content[0].text;
      const parsed = JSON.parse(jsonText);
      expect(parsed.code).toBe(ErrorCode.InvalidRequest);
      expect(parsed.message).toBe('Resource not found');
      expect(parsed.details).toEqual({
        message: 'Resource not found',
      });
      expect(typeof parsed.requestId).toBe('string');
    });

    test('should create an MCP error response from an MCP error', () => {
      const mcpError = new McpError(ErrorCode.MethodNotFound, 'Method not found');

      const response = ErrorHandler.createMcpErrorResponse(mcpError);
      expect(response.isError).toBe(true);

      const jsonText = response.content[0].text;
      const parsed = JSON.parse(jsonText);
      expect(parsed.code).toBe(ErrorCode.MethodNotFound);
      expect(parsed.message).toContain('Method not found');
      expect(typeof parsed.requestId).toBe('string');
    });

    test('should create an MCP error response from a generic error', () => {
      const error = new Error('Something went wrong');

      const response = ErrorHandler.createMcpErrorResponse(error);

      const jsonText = response.content[0].text;
      const parsed = JSON.parse(jsonText);
      expect(parsed.code).toBe(ErrorCode.InternalError);
      expect(parsed.message).toBe('Something went wrong');
      expect(typeof parsed.requestId).toBe('string');
    });

    test('should handle errors without messages', () => {
      const error = new Error();
      error.message = undefined;

      const response = ErrorHandler.createMcpErrorResponse(error);

      const jsonText = response.content[0].text;
      const parsed = JSON.parse(jsonText);
      expect(parsed.code).toBe(ErrorCode.InternalError);
      expect(parsed.message).toBe('Internal server error');
      expect(typeof parsed.requestId).toBe('string');
    });
  });

  describe('expressErrorHandler', () => {
    test('should create a properly formatted response for express errors', () => {
      // Mock Express response object
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      const err = new Error('Express error');
      err.status = 400;

      ErrorHandler.expressErrorHandler(err, {}, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 400,
          message: 'Express error',
        })
      );
      expect(console.error).toHaveBeenCalled();
    });

    test('should handle express errors without status or message', () => {
      // Mock Express response object
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      const err = new Error();
      err.message = undefined;

      ErrorHandler.expressErrorHandler(err, {}, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 500,
          message: 'Internal server error',
        })
      );
    });
  });
});
