module.exports = {
  displayName: '@vaultlayer/vincent-ability-evm-send',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.spec.ts', '<rootDir>/src/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/**/*.ts'],
  detectOpenHandles: true,
  modulePathIgnorePatterns: ['<rootDir>/dist'],
};
