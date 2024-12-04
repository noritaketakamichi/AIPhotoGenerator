export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json'
    }
  }
};
