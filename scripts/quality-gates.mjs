#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const stages = ['lint', 'typecheck', 'test'];
const forcedFailureStage = process.env.GATE_FORCE_FAIL_STAGE || '';

function runStage(stage) {
  console.log(`\n[quality-gates] Stage: ${stage.toUpperCase()}`);
  console.log('[quality-gates] ----------------------------------------');

  if (forcedFailureStage === stage) {
    console.error(
      `[quality-gates] Stage ${stage.toUpperCase()} forced to FAIL by GATE_FORCE_FAIL_STAGE`
    );
    return 1;
  }

  const result = spawnSync('npm', ['run', stage], {
    stdio: 'inherit',
    env: process.env,
  });

  if (result.status !== 0) {
    console.error(
      `[quality-gates] Stage ${stage.toUpperCase()} FAILED with code ${result.status}`
    );
    return result.status || 1;
  }

  console.log(`[quality-gates] Stage ${stage.toUpperCase()} PASSED`);
  return 0;
}

function run() {
  console.log('[quality-gates] Starting mandatory gate sequence: lint -> typecheck -> test');

  for (const stage of stages) {
    const code = runStage(stage);
    if (code !== 0) {
      console.error('[quality-gates] Pipeline halted due to failing stage.');
      process.exit(code);
    }
  }

  console.log('\n[quality-gates] PASS: all mandatory gates completed.');
}

run();
