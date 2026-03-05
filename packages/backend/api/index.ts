// Vercel executes this entrypoint in a CommonJS context.
// Keep CJS exports and require to avoid ESM runtime mismatch in production.
const app = require('../src/app').default;

module.exports = app;
