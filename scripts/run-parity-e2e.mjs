import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const rootDir = process.cwd();

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

async function buildFixtureEnv() {
  loadEnvFile('.env.local');
  loadEnvFile('.env');

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
  const fixtureEnv = await buildFixtureEnv();
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
