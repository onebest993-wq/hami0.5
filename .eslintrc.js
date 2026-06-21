module.exports = {
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    project: './tsconfig.json',
  },
  plugins: ["react"],
  rules: {
    "react/jsx-closing-bracket-location": "error",
    "react/jsx-closing-tag-location": "error",
  },
};
