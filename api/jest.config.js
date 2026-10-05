/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  // Integração precisa do Postgres: roda à parte com "npm run test:integration".
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/tests/integration/'],
};
