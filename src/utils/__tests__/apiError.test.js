/**
 * Tests for the ApiError class
 */
import { ApiError } from '../apiError.js';

describe('ApiError', () => {
  test('should create an error with default status 500', () => {
    const errorMessage = 'Test error';
    const error = new ApiError(errorMessage);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ApiError');
    expect(error.message).toBe(errorMessage);
    expect(error.status).toBe(500);
  });

  test('should create an error with custom status code', () => {
    const errorMessage = 'Not found';
    const statusCode = 404;
    const error = new ApiError(errorMessage, statusCode);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ApiError');
    expect(error.message).toBe(errorMessage);
    expect(error.status).toBe(statusCode);
  });

  test('should be able to be thrown and caught as an error', () => {
    expect(() => {
      throw new ApiError('Test error', 400);
    }).toThrow(ApiError);
  });
});
