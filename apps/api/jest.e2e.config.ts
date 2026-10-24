const baseConfig = require('./jest.config.ts').default ?? require('./jest.config.ts');

const setupFiles = Array.isArray(baseConfig.setupFiles)
  ? [...baseConfig.setupFiles]
  : baseConfig.setupFiles
    ? [baseConfig.setupFiles]
    : [];

module.exports = {
  ...baseConfig,
  setupFiles: [...setupFiles, './test/setup-test-env.ts'],
  testRegex: '.*\\.e2e-spec\\.ts$',
};
