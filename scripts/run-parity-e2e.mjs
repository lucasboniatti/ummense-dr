import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const rootDir = process.cwd();
const REQUIRED_FIXTURE_ENVS = ['SUPABASE_URL', 'JWT_SECRET'];
const REQUIRED_FIXTURE_SECRETS = ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET'];

function loadEnvFile(filename) {
  const filePath = resolve(rootDir, filename);
  if (!existsSync(filePath)) {
    return;
  }

  const content = readFileSync(filePath, 'utf8');
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    if (process.env[key]) {
      continue;
    }

    let value = rawValue.trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function parseShellExports(stdout) {
  const env = {};

  for (const line of stdout.split('\n')) {
    const match = line.match(/^export\s+([A-Za-z_][A-Za-z0-9_]*)='(.*)'$/);
    if (!match) {
      continue;
    }

    const [, key, value] = match;
    env[key] = value;
  }

  return env;
}

function shouldSkipEnvFiles() {
  return process.env.PARITY_SKIP_ENV_FILES === '1';
}

function hasRequiredFixtureEnv() {
  const hasBase = REQUIRED_FIXTURE_ENVS.every((key) => Boolean(process.env[key]));
  const hasSecret = REQUIRED_FIXTURE_SECRETS.some((key) => Boolean(process.env[key]));
  return hasBase && hasSecret;
}

function isMissingFixtureEnvError(error) {
  const message =
    error instanceof Error
      ? `${error.message}\n${'stdout' in error ? error.stdout || '' : ''}\n${'stderr' in error ? error.stderr || '' : ''}`
      : String(error);

  return message.includes('[fixture] Missing env:');
}

async function buildFixtureEnv() {
  if (!shouldSkipEnvFiles()) {
    loadEnvFile('.env.local');
    loadEnvFile('.env');
  }

  if (!hasRequiredFixtureEnv()) {
    console.warn(
      '[parity] Fixture env ausente. Executando smoke-only parity sem fixture autenticada.'
    );
    return {};
  }

  const { stdout } = await execFileAsync(
    process.execPath,
    ['scripts/create-epic6-parity-fixture.mjs', '--shell'],
    {
      cwd: rootDir,
      env: process.env,
      maxBuffer: 1024 * 1024 * 4,
    }
  );

  return parseShellExports(stdout);
}

async function main() {
  let fixtureEnv = {};
  try {
    fixtureEnv = await buildFixtureEnv();
  } catch (error) {
    if (!isMissingFixtureEnvError(error)) {
      throw error;
    }

    console.warn(
      '[parity] Fixture cloud indisponível no ambiente atual. Continuando com smoke-only parity.'
    );
    fixtureEnv = {};
  }
  const playwrightBin = resolve(
    rootDir,
    process.platform === 'win32' ? 'node_modules/.bin/playwright.cmd' : 'node_modules/.bin/playwright'
  );

  const child = spawn(playwrightBin, ['test', '-c', 'packages/e2e/playwright.parity.config.ts'], {
    cwd: rootDir,
    env: {
      ...process.env,
      ...fixtureEnv,
    },
    stdio: 'inherit',
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 1);
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
