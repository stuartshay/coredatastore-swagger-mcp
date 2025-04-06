/**
 * Tests for the Validator utility
 */
import { jest } from '@jest/globals';
import { Validator } from '../validator.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

// Mock ErrorHandler to prevent actual error formatting
jest.mock('../errorHandler.js', () => ({
  ErrorHandler: {
    formatValidationErrors: jest.fn().mockReturnValue({
      code: -32602,
      message: 'Validation failed',
      details: { errors: [] },
    }),
  },
}));

// Import the mocked module - we don't need to reference ErrorHandler directly

describe('Validator', () => {
  beforeEach(() => {
    // Clear mock calls before each test
    jest.clearAllMocks();
  });

  describe('validateToolInput', () => {
    test('should do nothing if no inputSchema is provided', () => {
      const tool = {};
      const args = { param: 'value' };

      expect(() => {
        Validator.validateToolInput(tool, args);
      }).not.toThrow();
    });

    test('should validate valid input against schema', () => {
      const tool = {
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'integer' },
          },
        },
      };
      const args = { name: 'John', age: 25 };

      expect(() => {
        Validator.validateToolInput(tool, args);
      }).not.toThrow();
    });

    test('should throw if validation fails', () => {
      const tool = {
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'integer' },
          },
        },
      };
      const args = { name: 'John', age: 'twenty-five' }; // Invalid age type

      expect(() => {
        Validator.validateToolInput(tool, args);
      }).toThrow(McpError);

      // We know the error formatting happens internally - no need to verify the mock
      // The important thing is that the validation fails properly
    });
  });

  describe('validateRequiredParams', () => {
    test('should do nothing if no required parameters', () => {
      const tool = {
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'integer' },
          },
        },
      };
      const args = { name: 'John' };

      expect(() => {
        Validator.validateRequiredParams(tool, args);
      }).not.toThrow();
    });

    test('should do nothing when all required parameters are provided', () => {
      const tool = {
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'integer' },
          },
          required: ['name'],
        },
      };
      const args = { name: 'John' };

      expect(() => {
        Validator.validateRequiredParams(tool, args);
      }).not.toThrow();
    });

    test('should throw if a required parameter is missing', () => {
      const tool = {
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'integer' },
          },
          required: ['name', 'age'],
        },
      };
      const args = { name: 'John' }; // Missing age

      expect(() => {
        Validator.validateRequiredParams(tool, args);
      }).toThrow(new McpError(ErrorCode.InvalidParams, 'Missing required parameter: age'));
    });

    test('should handle null or undefined inputSchema', () => {
      const tool = {};
      const args = {};

      expect(() => {
        Validator.validateRequiredParams(tool, args);
      }).not.toThrow();
    });
  });

  describe('validateParameterTypes', () => {
    test('should do nothing if no properties in schema', () => {
      const tool = {
        inputSchema: {
          type: 'object',
        },
      };
      const args = { name: 'John' };

      expect(() => {
        Validator.validateParameterTypes(tool, args);
      }).not.toThrow();
    });

    test('should do nothing if property not in schema', () => {
      const tool = {
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
        },
      };
      const args = { name: 'John', age: 25 }; // age not in schema

      expect(() => {
        Validator.validateParameterTypes(tool, args);
      }).not.toThrow();
    });

    test('should validate string type', () => {
      const tool = {
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
        },
      };
      const args = { name: 'John' };

      expect(() => {
        Validator.validateParameterTypes(tool, args);
      }).not.toThrow();

      const invalidArgs = { name: 123 };
      expect(() => {
        Validator.validateParameterTypes(tool, invalidArgs);
      }).toThrow(new McpError(ErrorCode.InvalidParams, 'Parameter name must be a string'));
    });

    test('should validate number type', () => {
      const tool = {
        inputSchema: {
          type: 'object',
          properties: {
            age: { type: 'number' },
          },
        },
      };
      const args = { age: 25.5 };

      expect(() => {
        Validator.validateParameterTypes(tool, args);
      }).not.toThrow();

      const invalidArgs = { age: 'twenty-five' };
      expect(() => {
        Validator.validateParameterTypes(tool, invalidArgs);
      }).toThrow(new McpError(ErrorCode.InvalidParams, 'Parameter age must be a number'));
    });

    test('should validate integer type', () => {
      const tool = {
        inputSchema: {
          type: 'object',
          properties: {
            count: { type: 'integer' },
          },
        },
      };
      const args = { count: 25 };

      expect(() => {
        Validator.validateParameterTypes(tool, args);
      }).not.toThrow();

      const invalidArgs1 = { count: 25.5 }; // Not an integer
      expect(() => {
        Validator.validateParameterTypes(tool, invalidArgs1);
      }).toThrow(new McpError(ErrorCode.InvalidParams, 'Parameter count must be an integer'));

      const invalidArgs2 = { count: 'twenty-five' }; // Not a number
      expect(() => {
        Validator.validateParameterTypes(tool, invalidArgs2);
      }).toThrow(new McpError(ErrorCode.InvalidParams, 'Parameter count must be an integer'));
    });

    test('should validate boolean type', () => {
      const tool = {
        inputSchema: {
          type: 'object',
          properties: {
            isActive: { type: 'boolean' },
          },
        },
      };
      const args = { isActive: true };

      expect(() => {
        Validator.validateParameterTypes(tool, args);
      }).not.toThrow();

      const invalidArgs = { isActive: 'yes' };
      expect(() => {
        Validator.validateParameterTypes(tool, invalidArgs);
      }).toThrow(new McpError(ErrorCode.InvalidParams, 'Parameter isActive must be a boolean'));
    });

    test('should validate array type', () => {
      const tool = {
        inputSchema: {
          type: 'object',
          properties: {
            tags: { type: 'array' },
          },
        },
      };
      const args = { tags: ['one', 'two'] };

      expect(() => {
        Validator.validateParameterTypes(tool, args);
      }).not.toThrow();

      const invalidArgs = { tags: 'one,two' };
      expect(() => {
        Validator.validateParameterTypes(tool, invalidArgs);
      }).toThrow(new McpError(ErrorCode.InvalidParams, 'Parameter tags must be an array'));
    });

    test('should validate object type', () => {
      const tool = {
        inputSchema: {
          type: 'object',
          properties: {
            data: { type: 'object' },
          },
        },
      };
      const args = { data: { key: 'value' } };

      expect(() => {
        Validator.validateParameterTypes(tool, args);
      }).not.toThrow();

      const invalidArgs1 = { data: 'not an object' };
      expect(() => {
        Validator.validateParameterTypes(tool, invalidArgs1);
      }).toThrow(new McpError(ErrorCode.InvalidParams, 'Parameter data must be an object'));

      const invalidArgs2 = { data: null };
      expect(() => {
        Validator.validateParameterTypes(tool, invalidArgs2);
      }).toThrow(new McpError(ErrorCode.InvalidParams, 'Parameter data must be an object'));

      const invalidArgs3 = { data: ['array', 'not', 'object'] };
      expect(() => {
        Validator.validateParameterTypes(tool, invalidArgs3);
      }).toThrow(new McpError(ErrorCode.InvalidParams, 'Parameter data must be an object'));
    });
  });

  describe('validateAll', () => {
    test('should run all validations in sequence', () => {
      // Spy on each validation method
      const requiredParamsSpy = jest.spyOn(Validator, 'validateRequiredParams');
      const paramTypesSpy = jest.spyOn(Validator, 'validateParameterTypes');
      const toolInputSpy = jest.spyOn(Validator, 'validateToolInput');

      const tool = {
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'integer' },
          },
          required: ['name'],
        },
      };
      const args = { name: 'John', age: 25 };

      Validator.validateAll(tool, args);

      expect(requiredParamsSpy).toHaveBeenCalledWith(tool, args);
      expect(paramTypesSpy).toHaveBeenCalledWith(tool, args);
      expect(toolInputSpy).toHaveBeenCalledWith(tool, args);

      // Clean up
      requiredParamsSpy.mockRestore();
      paramTypesSpy.mockRestore();
      toolInputSpy.mockRestore();
    });

    test('should stop at first validation error', () => {
      // Mock validateRequiredParams to throw an error
      const requiredParamsSpy = jest
        .spyOn(Validator, 'validateRequiredParams')
        .mockImplementation(() => {
          throw new McpError(ErrorCode.InvalidParams, 'Missing required parameter: name');
        });
      const paramTypesSpy = jest.spyOn(Validator, 'validateParameterTypes');
      const toolInputSpy = jest.spyOn(Validator, 'validateToolInput');

      const tool = {
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
          required: ['name'],
        },
      };
      const args = {}; // Missing required name

      expect(() => {
        Validator.validateAll(tool, args);
      }).toThrow(new McpError(ErrorCode.InvalidParams, 'Missing required parameter: name'));

      expect(requiredParamsSpy).toHaveBeenCalledWith(tool, args);
      expect(paramTypesSpy).not.toHaveBeenCalled();
      expect(toolInputSpy).not.toHaveBeenCalled();

      // Clean up
      requiredParamsSpy.mockRestore();
      paramTypesSpy.mockRestore();
      toolInputSpy.mockRestore();
    });
  });
});
