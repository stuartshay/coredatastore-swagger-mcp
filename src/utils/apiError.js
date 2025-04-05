/**
 * Custom error class for API errors that includes HTTP status
 */
export class ApiError extends Error {
  /**
   * Create a new API error
   * @param {string} message - Error message
   * @param {number} status - HTTP status code (default: 500)
   */
  constructor(message, status = 500) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}
