#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

const requiredByTarget = {
  backend: [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'JWT_SECRET',
  ],
  frontend: ['NEXT_PUBLIC_API_BASE_URL'],
  infra: [],
};

const insecurePlaceholders = {
  JWT_SECRET: [
    /^your-secret-key$/i,
    /^changeme$/i,
    /^change-me$/i,
    /^password$/i,
    /^123456$/,
    /^jwt-secret$/i,
  ],
  SUPABASE_SERVICE_ROLE_KEY: [/^your-service-role-key$/i, /^service-role-key$/i],
  SUPABASE_ANON_KEY: [/^your-anon-key$/i, /^anon-key$/i],
};

function parseArgs(argv) {
  const targetFlagIndex = argv.findIndex((arg) => arg === '--target');
  if (targetFlagIndex === -1) {
    return 'all';
  }

  const value = argv[targetFlagIndex + 1];
  if (!value) {
    throw new Error('Missing value for --target. Use: backend|frontend|infra|all');
  }

  return value;
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const entries = {};

  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const eq = trimmed.indexOf('=');
    if (eq === -1) {
      continue;
    }

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    entries[key] = value;
  }

  return entries;
}

function resolveTargets(targetArg) {
  if (targetArg === 'all') {
    return ['backend', 'frontend', 'infra'];
  }

  if (!(targetArg in requiredByTarget)) {
    throw new Error(
      `Invalid --target "${targetArg}". Use: backend|frontend|infra|all`
    );
  }

  return [targetArg];
}

function isMissing(value) {
  return value === undefined || value === null || String(value).trim() === '';
}

function findInsecureValues(entries) {
  const violations = [];

  for (const [key, patterns] of Object.entries(insecurePlaceholders)) {
    const value = entries[key];
    if (isMissing(value)) {
      continue;
    }

    if (patterns.some((pattern) => pattern.test(String(value).trim()))) {
      violations.push({
        key,
        reason: 'contains a known insecure placeholder',
      });
    }
  }

  const jwt = entries.JWT_SECRET;
  if (!isMissing(jwt) && String(jwt).trim().length < 12) {
    violations.push({
      key: 'JWT_SECRET',
      reason: 'must be at least 12 characters long',
    });
  }

  return violations;
}

function printSection(title) {
  console.log(`\n[env:check] ${title}`);
}

function run() {
  const targetArg = parseArgs(process.argv.slice(2));
  const targets = resolveTargets(targetArg);
  const envFile = parseEnvFile(path.join(rootDir, '.env'));
  const mergedEnv = { ...envFile, ...process.env };
  let hasFailure = false;

  printSection(`targets=${targets.join(',')}`);

  for (const target of targets) {
    const requiredVars = requiredByTarget[target];
    const missing = requiredVars.filter((name) => isMissing(mergedEnv[name]));
    const insecure = findInsecureValues(mergedEnv).filter((item) =>
      requiredVars.includes(item.key)
    );

    console.log(`\n- ${target}`);
    if (requiredVars.length === 0) {
      console.log('  required vars: none');
    } else {
      console.log(`  required vars: ${requiredVars.join(', ')}`);
    }

    if (missing.length === 0) {
      console.log('  missing vars: none');
    } else {
      hasFailure = true;
      console.log(`  missing vars: ${missing.join(', ')}`);
    }

    if (insecure.length === 0) {
      console.log('  insecure placeholders: none');
    } else {
      hasFailure = true;
      console.log('  insecure placeholders:');
      for (const issue of insecure) {
        console.log(`    - ${issue.key}: ${issue.reason}`);
      }
    }
  }

  if (hasFailure) {
    console.error(
      '\n[env:check] FAIL: configure missing/unsafe variables before startup.'
    );
    process.exit(1);
  }

  console.log('\n[env:check] PASS');
}

try {
  run();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[env:check] ERROR: ${message}`);
  process.exit(1);
}
