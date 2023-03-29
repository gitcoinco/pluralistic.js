/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: "ts-jest",
  testEnvironment: "node",
  resolver: "ts-jest-resolver",
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
};
