import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import crypto from 'crypto';

/**
 * Generates a unique request ID
 * @returns {string} A unique request ID
 */
export function generateRequestId() {
  return crypto.randomBytes(8).toString('hex');
}

/**
 * ErrorHandler class for standardizing error handling across the application
 */
export class ErrorHandler {
  /**
   * Maps HTTP status codes to MCP error codes
   * @param {number} httpStatus - HTTP status code
   * @returns {number} MCP error code value
   */
  static mapHttpToMcpCode(httpStatus) {
    switch (httpStatus) {
    case 400:
      return ErrorCode.InvalidParams;
    case 401:
    case 403:
      return ErrorCode.InvalidRequest; // No specific auth error, use InvalidRequest
    case 404:
      return ErrorCode.InvalidRequest; // Use InvalidRequest for Not Found
    case 408:
    case 504:
      return ErrorCode.RequestTimeout; // Use RequestTimeout for timeouts
    case 429:
      return ErrorCode.InvalidRequest; // Use InvalidRequest for rate limits
    case 500:
    case 502:
    case 503:
      return ErrorCode.InternalError;
    default:
      return ErrorCode.InternalError;
    }
  }

  /**
   * Formats an API error for MCP response
   * @param {Object} apiError - Error from API call
   * @returns {Object} Formatted error object
   */
  static formatApiError(apiError) {
    // Extract status and data from fetch response
    const status = apiError.status || 500;
    let message = 'API Error';
    let details = {};

    try {
      if (apiError.data) {
        details = apiError.data;
        message = apiError.data.message || message;
      }
    } catch (err) {
      console.error('Error parsing API error response:', err);
    }

    return {
      code: this.mapHttpToMcpCode(status),
      message,
      details,
      requestId: generateRequestId(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Formats a validation error for MCP response
   * @param {Array} validationErrors - Array of validation errors
   * @returns {Object} Formatted error object
   */
  static formatValidationErrors(validationErrors) {
    const errors = validationErrors.map(err => ({
      path: err.instancePath,
      message: err.message,
      keyword: err.keyword,
      params: err.params,
    }));

    return {
      code: ErrorCode.InvalidParams,
      message: 'Validation failed',
      details: { errors },
      requestId: generateRequestId(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Creates an MCP error response
   * @param {Object} error - Error object
   * @param {boolean} isApiError - Whether the error is from an API call
   * @returns {Object} MCP error response
   */
  static createMcpErrorResponse(error, isApiError = false) {
    let formattedError;

    if (isApiError) {
      formattedError = this.formatApiError(error);
    } else if (error instanceof McpError) {
      formattedError = {
        code: error.code,
        message: error.message,
        requestId: generateRequestId(),
        timestamp: new Date().toISOString(),
      };
    } else {
      formattedError = {
        code: ErrorCode.InternalError,
        message: error.message || 'Internal server error',
        requestId: generateRequestId(),
        timestamp: new Date().toISOString(),
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(formattedError, null, 2),
        },
      ],
      isError: true,
    };
  }

  /**
   * Express middleware for handling errors
   */
  static expressErrorHandler(err, req, res, _next) {
    const status = err.status || 500;

    const error = {
      status,
      message: err.message || 'Internal server error',
      requestId: generateRequestId(),
      timestamp: new Date().toISOString(),
    };

    console.error(`[ERROR] ${error.requestId}: ${error.message}`);

    res.status(status).json(error);
  }
}
