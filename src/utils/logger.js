/* eslint-disable no-console */
// filepath: /home/vagrant/git/coredatastore-swagger-mcp/src/utils/logger.js
/**
 * Logger module for structured logging with various levels
 */

// Log levels in increasing order of severity
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

// This var will be initialized once and then not updated
// In tests, we need to use jest.resetModules() to reload it
let currentLogLevel = process.env.LOG_LEVEL
  ? LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()] || LOG_LEVELS.INFO
  : LOG_LEVELS.INFO;

// For testing - allows resetting the log level without module reload
export function setLogLevel(level) {
  if (LOG_LEVELS[level] !== undefined) {
    currentLogLevel = LOG_LEVELS[level];
  }
}

/**
 * Creates a correlation ID for request tracking
 * @returns {string} A unique correlation ID
 */
export function createCorrelationId() {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2);
  return timestamp + randomPart;
}

/**
 * Formats log entry as JSON
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} data - Additional data to log
 * @param {string} correlationId - Optional correlation ID
 * @returns {string} Formatted log entry
 */
function formatLogEntry(level, message, data = {}, correlationId = null) {
  const timestamp = new Date().toISOString();

  const logEntry = {
    timestamp,
    level,
    message,
    correlationId: correlationId || createCorrelationId(),
    ...data,
  };

  return JSON.stringify(logEntry);
}

/**
 * List of sensitive keys that should be redacted in logs
 */
export const SENSITIVE_KEYS = [
  'password',
  'token',
  'secret',
  'authorization',
  'apikey',
  'api_key',
  'secretkey',
];

/**
 * Sanitizes sensitive data from objects before logging
 * @param {Object} obj - Object to sanitize
 * @returns {Object} Sanitized object
 */
export function sanitizeData(obj) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const result = { ...obj };

  for (const key of Object.keys(result)) {
    const lowerKey = key.toLowerCase();

    // Check if the key exactly matches or includes a sensitive key pattern
    // Special case for 'key' alone - we don't want to redact simple 'key' properties
    const shouldRedact = SENSITIVE_KEYS.some(sensitiveKey => {
      // Don't redact standalone 'key' property
      if (lowerKey === 'key') {
        return false;
      }
      return lowerKey.includes(sensitiveKey);
    });

    if (shouldRedact) {
      result[key] = '[REDACTED]';
    } else if (typeof result[key] === 'object' && result[key] !== null) {
      result[key] = sanitizeData(result[key]);
    }
  }

  return result;
}

/**
 * Logger class implementation
 */
export class Logger {
  // Allows creating logger instances with default correlation IDs
  constructor(options = {}) {
    this.defaultCorrelationId = options.correlationId;
    this.defaultMetadata = options.metadata || {};
  }

  /**
   * Create a child logger with inherited context
   * @param {Object} metadata - Additional metadata for the child logger
   * @param {string} correlationId - Correlation ID for the child logger
   * @returns {Logger} Child logger instance
   */
  child(metadata = {}, correlationId = null) {
    return new Logger({
      correlationId: correlationId || this.defaultCorrelationId,
      metadata: { ...this.defaultMetadata, ...metadata },
    });
  }

  /**
   * Log at debug level
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   * @param {string} correlationId - Optional correlation ID
   */
  debug(message, data = {}, correlationId = null) {
    if (currentLogLevel <= LOG_LEVELS.DEBUG) {
      const sanitizedData = sanitizeData(data);
      const cid = correlationId || this.defaultCorrelationId;
      const mergedData = { ...this.defaultMetadata, ...sanitizedData };

      console.debug(formatLogEntry('DEBUG', message, mergedData, cid));
    }
  }

  /**
   * Log at info level
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   * @param {string} correlationId - Optional correlation ID
   */
  info(message, data = {}, correlationId = null) {
    if (currentLogLevel <= LOG_LEVELS.INFO) {
      const sanitizedData = sanitizeData(data);
      const cid = correlationId || this.defaultCorrelationId;
      const mergedData = { ...this.defaultMetadata, ...sanitizedData };

      console.info(formatLogEntry('INFO', message, mergedData, cid));
    }
  }

  /**
   * Log at warn level
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   * @param {string} correlationId - Optional correlation ID
   */
  warn(message, data = {}, correlationId = null) {
    if (currentLogLevel <= LOG_LEVELS.WARN) {
      const sanitizedData = sanitizeData(data);
      const cid = correlationId || this.defaultCorrelationId;
      const mergedData = { ...this.defaultMetadata, ...sanitizedData };

      console.warn(formatLogEntry('WARN', message, mergedData, cid));
    }
  }

  /**
   * Log at error level
   * @param {string} message - Log message
   * @param {Object|Error} error - Error object or additional data
   * @param {string} correlationId - Optional correlation ID
   */
  error(message, error = {}, correlationId = null) {
    if (currentLogLevel <= LOG_LEVELS.ERROR) {
      let errorData = {};

      if (error instanceof Error) {
        errorData = {
          errorName: error.name,
          errorMessage: error.message,
          stack: error.stack,
        };
      } else {
        errorData = error;
      }

      const sanitizedData = sanitizeData(errorData);
      const cid = correlationId || this.defaultCorrelationId;
      const mergedData = { ...this.defaultMetadata, ...sanitizedData };

      console.error(formatLogEntry('ERROR', message, mergedData, cid));
    }
  }

  /**
   * Create Express middleware for request logging
   * @returns {Function} Express middleware
   */
  static expressMiddleware() {
    return (req, res, next) => {
      const start = Date.now();
      const correlationId = createCorrelationId();
      const logger = new Logger({ correlationId });

      // Attach logger to request object for use in route handlers
      req.logger = logger;

      // Log request
      logger.info(`HTTP ${req.method} ${req.url}`, {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });

      // Add response listener to log after completion
      res.on('finish', () => {
        const duration = Date.now() - start;
        const level = res.statusCode >= 400 ? 'warn' : 'info';

        logger[level](`HTTP ${req.method} ${req.url} ${res.statusCode}`, {
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
        });
      });

      next();
    };
  }
}

// Create and export default logger instance
export const logger = new Logger({ metadata: { service: 'coredatastore-swagger-mcp' } });
