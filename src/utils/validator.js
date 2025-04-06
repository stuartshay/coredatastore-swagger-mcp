import Ajv from 'ajv';
import { ErrorHandler } from './errorHandler.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

const ajv = new Ajv({ allErrors: true });

/**
 * Validator class for validating tool inputs against JSON Schema
 */
export class Validator {
  /**
   * Validates tool arguments against the tool's input schema
   * @param {Object} tool - Tool definition
   * @param {Object} args - Tool arguments
   * @throws {McpError} - If validation fails
   */
  static validateToolInput(tool, args) {
    if (!tool.inputSchema) {
      return; // No schema to validate against
    }

    const validate = ajv.compile(tool.inputSchema);
    const valid = validate(args);

    if (!valid) {
      const formattedErrors = ErrorHandler.formatValidationErrors(validate.errors);
      throw new McpError(ErrorCode.InvalidParams, JSON.stringify(formattedErrors));
    }
  }

  /**
   * Ensures all required parameters are present
   * @param {Object} tool - Tool definition
   * @param {Object} args - Tool arguments
   * @throws {McpError} - If required parameters are missing
   */
  static validateRequiredParams(tool, args) {
    const required = tool.inputSchema?.required || [];

    for (const param of required) {
      if (args[param] === undefined) {
        throw new McpError(ErrorCode.InvalidParams, `Missing required parameter: ${param}`);
      }
    }
  }

  /**
   * Validates parameters based on their types
   * @param {Object} tool - Tool definition
   * @param {Object} args - Tool arguments
   */
  static validateParameterTypes(tool, args) {
    if (!tool.inputSchema?.properties) {
      return;
    }

    const properties = tool.inputSchema.properties;

    for (const [name, value] of Object.entries(args)) {
      const propSchema = properties[name];
      if (!propSchema) continue;

      // Basic type checking
      switch (propSchema.type) {
      case 'string':
        if (typeof value !== 'string') {
          throw new McpError(ErrorCode.InvalidParams, `Parameter ${name} must be a string`);
        }
        break;
      case 'number':
        if (typeof value !== 'number') {
          throw new McpError(ErrorCode.InvalidParams, `Parameter ${name} must be a number`);
        }
        break;
      case 'integer':
        if (typeof value !== 'number' || !Number.isInteger(value)) {
          throw new McpError(ErrorCode.InvalidParams, `Parameter ${name} must be an integer`);
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          throw new McpError(ErrorCode.InvalidParams, `Parameter ${name} must be a boolean`);
        }
        break;
      case 'array':
        if (!Array.isArray(value)) {
          throw new McpError(ErrorCode.InvalidParams, `Parameter ${name} must be an array`);
        }
        break;
      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          throw new McpError(ErrorCode.InvalidParams, `Parameter ${name} must be an object`);
        }
        break;
      }
    }
  }

  /**
   * Complete parameter validation
   * @param {Object} tool - Tool definition
   * @param {Object} args - Tool arguments
   * @throws {McpError} - If validation fails
   */
  static validateAll(tool, args) {
    // First check if required params are present
    this.validateRequiredParams(tool, args);

    // Then do type validation for basic type checking
    this.validateParameterTypes(tool, args);

    // Finally do full schema validation
    this.validateToolInput(tool, args);
  }
}
