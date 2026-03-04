import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const nextConfig = require('../../next.config.js');

test('next config não ignora erros de lint/typecheck no build', () => {
  assert.notEqual(nextConfig?.typescript?.ignoreBuildErrors, true);
  assert.notEqual(nextConfig?.eslint?.ignoreDuringBuilds, true);
});

test('rewrites aponta /api e /health para NEXT_PUBLIC_API_BASE_URL', async () => {
  process.env.NEXT_PUBLIC_API_BASE_URL = 'https://backend.example.com';
  const rewrites = await nextConfig.rewrites();

  const apiRewrite = rewrites.find((rewrite) => rewrite.source === '/api/:path*');
  const healthRewrite = rewrites.find((rewrite) => rewrite.source === '/health');

  assert.equal(apiRewrite?.destination, 'https://backend.example.com/api/:path*');
  assert.equal(healthRewrite?.destination, 'https://backend.example.com/health');
});
