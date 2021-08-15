/** @type {import('@ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  globals: {
    "__DEV__": true,
    "__EXPERIMENTAL__": false,
    "__PROFILE__": false,
    "__REACT_DEVTOOLS_GLOBAL_HOOK__": false,
    "__VARIANT__": false
  },
};