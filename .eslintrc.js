const path = require("path");

module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
    tsconfigRootDir: __dirname,
    project: path.join(__dirname, "tsconfig.json"),
  },
  rules: {
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-floating-promises": "error",
    "no-console": "off",
  },
  env: {
    node: true,
    es2020: true,
  },
  overrides: [
    {
      files: ["tests/**/*.ts"],
      parserOptions: {
        tsconfigRootDir: __dirname,
        project: path.join(__dirname, "tsconfig.test.json"),
      },
    },
  ],
};
