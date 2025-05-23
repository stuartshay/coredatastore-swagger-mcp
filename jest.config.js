export default {
  testEnvironment: 'node',
  transform: {},
  // No need to specify .js as it's inferred from package.json type: module
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  coverageDirectory: './coverage',
  collectCoverageFrom: ['src/**/*.js', '!src/**/*.test.js', '!**/node_modules/**'],
  coverageThreshold: {
    global: {
      statements: 14,
      branches: 9,
      functions: 18,
      lines: 14,
    },
  },
};
