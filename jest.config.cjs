module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@main/(.*)$": "<rootDir>/src/$1",
    "^@types$": "<rootDir>/src/types",
  },
};
