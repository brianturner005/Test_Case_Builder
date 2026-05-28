module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
  ],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  settings: {
    react: { version: "detect" },
  },
  plugins: ["react", "react-hooks"],
  rules: {
    "react/react-in-jsx-scope": "off", // Not needed with React 17+ JSX transform
    "react/prop-types": "off",         // Not using PropTypes in this project
  },
};
