/** Testes de integração do SQL contra um Postgres real (banco hospital_test). */
/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/integration'],
  globalSetup: '<rootDir>/tests/integration/global-setup.ts',
  // Os arquivos compartilham o mesmo banco: um de cada vez.
  maxWorkers: 1,
};
