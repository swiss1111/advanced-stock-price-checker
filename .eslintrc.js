module.exports = {
  env: {
    node: true,
    es2021: true
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript'
  ],
  rules: {
    'import/order': ['error', {
      'newlines-between': 'always',
      'groups': ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
      'alphabetize': {
        'order': 'asc',
        'caseInsensitive': true
      }
    }],
    'linebreak-style': ['error', 'unix'],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    '@typescript-eslint/no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }]
  },
  settings: {
    'import/resolver': {
      node: {
        paths: ['src'],
        extensions: ['.js', '.jsx', '.ts', '.tsx']
      }
    }
  },
};
