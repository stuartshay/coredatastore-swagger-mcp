/**
 * Configuration loader based on environment
 */

// Load environment-specific configuration based on NODE_ENV
const environment = process.env.NODE_ENV || 'development';

// Default configuration values
const defaultConfig = {
  swaggerUrl: process.env.SWAGGER_URL || 'https://api.coredatastore.com/swagger/v1/swagger.json',
  apiBaseUrl: process.env.API_BASE_URL || 'https://api.coredatastore.com',
  port: parseInt(process.env.PORT || '3500', 10),
  logLevel: 'info',
  caching: {
    enabled: true,
    defaultTtl: 5 * 60 * 1000, // 5 minutes
    cleanupInterval: 10 * 60 * 1000 // 10 minutes
  },
  cors: {
    enabled: true,
    origin: '*'
  },
  rateLimit: {
    enabled: false,
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  }
};

// Environment-specific configurations
const configurations = {
  development: {
    ...defaultConfig,
    logLevel: 'debug',
    rateLimit: {
      ...defaultConfig.rateLimit,
      enabled: false
    }
  },

  staging: {
    ...defaultConfig,
    swaggerUrl: process.env.SWAGGER_URL || 'https://api-staging.coredatastore.com/swagger/v1/swagger.json',
    apiBaseUrl: process.env.API_BASE_URL || 'https://api-staging.coredatastore.com',
    logLevel: 'debug',
    caching: {
      ...defaultConfig.caching,
      enabled: true,
      defaultTtl: 3 * 60 * 1000 // 3 minutes
    },
    rateLimit: {
      ...defaultConfig.rateLimit,
      enabled: true,
      max: 200
    }
  },

  production: {
    ...defaultConfig,
    logLevel: 'info',
    caching: {
      ...defaultConfig.caching,
      enabled: true
    },
    cors: {
      ...defaultConfig.cors,
      origin: ['https://mcp.coredatastore.com', 'https://api.coredatastore.com']
    },
    rateLimit: {
      ...defaultConfig.rateLimit,
      enabled: true,
      max: 100
    }
  },

  test: {
    ...defaultConfig,
    logLevel: 'error',
    caching: {
      ...defaultConfig.caching,
      enabled: false
    },
    port: 3501
  }
};

// Get the configuration for the current environment, falling back to development
const config = configurations[environment] || configurations.development;

// Export the configuration
export default config;

// Export individual config sections for convenience
export const {
  swaggerUrl,
  apiBaseUrl,
  port,
  logLevel,
  caching,
  cors,
  rateLimit
} = config;

// Export a helper to determine if we're in a specific environment
export const isEnv = (env) => environment === env;
