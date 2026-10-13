import '@testing-library/jest-dom/vitest';

// Polyfill URL.createObjectURL and revokeObjectURL for jsdom
if (!window.URL.createObjectURL) {
  window.URL.createObjectURL = () => 'blob:mock-url-' + Math.random().toString(36);
}
if (!window.URL.revokeObjectURL) {
  window.URL.revokeObjectURL = () => {};
}
