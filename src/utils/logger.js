// filepath: /home/vagrant/git/coredatastore-swagger-mcp/src/utils/logger.js
/**
 * Logger module for structured logging with various levels
 * Supports both console and file-based logging with colorized output
 *
 * For better log viewing in VS Code, install the "Log File Highlighter" extension
 * Extension ID: emilast.LogFileHighlighter
 * This will add syntax highlighting to log files viewed in VS Code
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

// Log levels in increasing order of severity
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

// Configuration for logging
const LOG_CONFIG = {
  // Log level from environment or default to INFO
  level: process.env.LOG_LEVEL
    ? LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()] || LOG_LEVELS.INFO
    : LOG_LEVELS.INFO,

  // File logging options
  file: {
    // Whether to enable file logging (default true)
    enabled: process.env.FILE_LOGGING !== 'false',
    // Directory to store log files
    directory: process.env.LOG_DIRECTORY || 'logs',
    // Whether to also log to console when file logging is enabled
    consoleOutput: process.env.CONSOLE_LOGGING !== 'false',
    // Rotation interval in minutes (defaults to 60 minutes)
    rotationInterval: parseInt(process.env.LOG_ROTATION_INTERVAL || '60', 10),
  },
};

// Current log level
let currentLogLevel = LOG_CONFIG.level;

/**
 * File logger to manage writing logs to files
 */
class FileLogger {
  constructor() {
    this.currentLogFile = null;
    this.currentLogStream = null;
    this.logDirectory = path.resolve(process.cwd(), LOG_CONFIG.file.directory);
    this.nextRotationTime = null;

    // Ensure log directory exists
    if (!fs.existsSync(this.logDirectory)) {
      fs.mkdirSync(this.logDirectory, { recursive: true });
    }

    // Initialize log file
    this.rotateLogFile();
  }

  /**
   * Get a timestamp-based filename for the log
   * @returns {string} Formatted filename with timestamp
   */
  getTimestampedFilename() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');

    return `${year}_${month}_${day}_${hour}_${minute}.log`;
  }

  /**
   * Create a new log file with timestamped name
   */
  rotateLogFile() {
    // Close existing stream if any
    if (this.currentLogStream) {
      this.currentLogStream.end();
      this.currentLogStream = null;
    }

    // Create new filename and stream
    this.currentLogFile = path.join(this.logDirectory, this.getTimestampedFilename());
    this.currentLogStream = fs.createWriteStream(this.currentLogFile, { flags: 'a' });

    // Set next rotation time
    const now = new Date();
    this.nextRotationTime = new Date(now.getTime() + LOG_CONFIG.file.rotationInterval * 60 * 1000);

    console.info(`Logging to file: ${this.currentLogFile}`);
  }

  /**
   * Write a log entry to the current log file
   * @param {string} entry - Log entry to write
   */
  writeLog(entry) {
    // Check if we need to rotate log file
    const now = new Date();
    if (now >= this.nextRotationTime) {
      this.rotateLogFile();
    }

    // Write the entry to the file
    if (this.currentLogStream) {
      this.currentLogStream.write(entry + '\n');
    }
  }
}

// Create singleton instance of file logger
const fileLogger = LOG_CONFIG.file.enabled ? new FileLogger() : null;

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

  // Extract endpoint information from data if available
  let endpoint = '';
  if (data.url) {
    endpoint = data.url;
    // For MCP requests, include the method as well
    if (data.mcp_method) {
      endpoint = `${data.mcp_method} (${endpoint})`;
    }
  }

  const logEntry = {
    timestamp,
    level,
    message,
    correlationId: correlationId || createCorrelationId(),
    endpoint,
    ...data,
  };

  return JSON.stringify(logEntry);
}

/**
 * Format console output with colors
 * @param {string} level - Log level
 * @param {string} jsonString - JSON formatted log entry
 * @returns {string} Colorized output for console
 */
function formatColorConsoleOutput(level, jsonString) {
  // In test environment, return the raw JSON for testing
  if (process.env.NODE_ENV === 'test') {
    return jsonString;
  }

  try {
    const entry = JSON.parse(jsonString);
    const timestamp = chalk.gray(entry.timestamp);

    // Color by level
    let levelOutput;
    let messageColor;

    switch (level) {
      case 'DEBUG':
        levelOutput = chalk.blue(level);
        messageColor = chalk.cyan;
        break;
      case 'INFO':
        levelOutput = chalk.green(level);
        messageColor = chalk.white;
        break;
      case 'WARN':
        levelOutput = chalk.yellow(level);
        messageColor = chalk.yellow;
        break;
      case 'ERROR':
        levelOutput = chalk.red.bold(level);
        messageColor = chalk.red;
        break;
      default:
        levelOutput = level;
        messageColor = chalk.white;
    }

    // Format message parts
    const message = messageColor(entry.message);
    const correlationId = chalk.magenta(`[${entry.correlationId || ''}]`);

    // Format endpoint info if available
    const endpoint = entry.endpoint ? chalk.cyan(`"${entry.endpoint}"`) : '';

    return `${timestamp} ${levelOutput} ${correlationId} ${message} ${endpoint}`;
  } catch {
    // Fallback to plain JSON if parsing fails
    return jsonString;
  }
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

      const formattedEntry = formatLogEntry('DEBUG', message, mergedData, cid);

      // Log to file if enabled
      if (fileLogger) {
        fileLogger.writeLog(formattedEntry);
      }

      // Log to console if no file logging or console output is enabled alongside file logging
      if (!fileLogger || LOG_CONFIG.file.consoleOutput) {
        console.debug(formatColorConsoleOutput('DEBUG', formattedEntry));
      }
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

      const formattedEntry = formatLogEntry('INFO', message, mergedData, cid);

      // Log to file if enabled
      if (fileLogger) {
        fileLogger.writeLog(formattedEntry);
      }

      // Log to console if no file logging or console output is enabled alongside file logging
      if (!fileLogger || LOG_CONFIG.file.consoleOutput) {
        console.info(formatColorConsoleOutput('INFO', formattedEntry));
      }
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

      const formattedEntry = formatLogEntry('WARN', message, mergedData, cid);

      // Log to file if enabled
      if (fileLogger) {
        fileLogger.writeLog(formattedEntry);
      }

      // Log to console if no file logging or console output is enabled alongside file logging
      if (!fileLogger || LOG_CONFIG.file.consoleOutput) {
        console.warn(formatColorConsoleOutput('WARN', formattedEntry));
      }
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

      const formattedEntry = formatLogEntry('ERROR', message, mergedData, cid);

      // Log to file if enabled
      if (fileLogger) {
        fileLogger.writeLog(formattedEntry);
      }

      // Log to console if no file logging or console output is enabled alongside file logging
      if (!fileLogger || LOG_CONFIG.file.consoleOutput) {
        console.error(formatColorConsoleOutput('ERROR', formattedEntry));
      }
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

      // Capture request body for MCP requests
      let requestBody = null;
      if (req.url === '/mcp' && req.method === 'POST') {
        requestBody = req.body;
      }

      // Log request
      if (requestBody && requestBody.method && requestBody.method.startsWith('mcp.')) {
        // Log MCP request separately to provide more context
        logger.info(`MCP Request: ${requestBody.method}`, {
          method: req.method,
          url: req.url,
          mcp_method: requestBody.method,
          mcp_params: sanitizeData(requestBody.params || {}),
          ip: req.ip,
          userAgent: req.get('user-agent'),
        });
      } else {
        // Standard HTTP request
        logger.info(`HTTP ${req.method} ${req.url}`, {
          method: req.method,
          url: req.url,
          ip: req.ip,
          userAgent: req.get('user-agent'),
        });
      }

      // Add response listener to log after completion
      res.on('finish', () => {
        const duration = Date.now() - start;
        const level = res.statusCode >= 400 ? 'warn' : 'info';

        if (requestBody && requestBody.method && requestBody.method.startsWith('mcp.')) {
          // Log MCP response
          logger[level](`MCP Response: ${requestBody.method} ${res.statusCode}`, {
            method: req.method,
            url: req.url,
            mcp_method: requestBody.method,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
          });
        } else {
          // Standard HTTP response
          logger[level](`HTTP ${req.method} ${req.url} ${res.statusCode}`, {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
          });
        }
      });

      next();
    };
  }
}

// Create and export default logger instance
export const logger = new Logger({ metadata: { service: 'coredatastore-swagger-mcp' } });
