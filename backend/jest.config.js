/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  // Unit tests first (faster), then integration
  testSequencer: undefined,
  clearMocks: true,
  // Increase timeout for integration tests (AI stub + DB setup)
  testTimeout: 15000,
  // Collect coverage from src only
  collectCoverageFrom: ['src/**/*.js', '!src/server.js'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
}
