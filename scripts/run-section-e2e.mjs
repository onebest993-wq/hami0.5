#!/usr/bin/env node
/**
 * E2E لقسم مغلق — preview بعد build (E2E_USE_PREVIEW=1، PW_WORKERS=1).
 * Usage: node scripts/run-section-e2e.mjs test:e2e:settings [-- extra playwright args]
 */
import { spawnSync } from 'node:child_process';

const script = process.argv[2];
if (!script?.startsWith('test:e2e:')) {
    console.error('Usage: node scripts/run-section-e2e.mjs test:e2e:<section> [-- playwright args]');
    process.exit(1);
}

const dash = process.argv.indexOf('--');
const playwrightArgs = dash >= 0 ? process.argv.slice(dash + 1) : [];

const env = {
    ...process.env,
    E2E_USE_PREVIEW: process.env.E2E_USE_PREVIEW ?? '1',
    E2E_SKIP_WEBSERVER: process.env.E2E_SKIP_WEBSERVER ?? '0',
    PW_WORKERS: process.env.PW_WORKERS ?? '1',
};

const result = spawnSync('npm', ['run', script, '--', ...playwrightArgs], {
    stdio: 'inherit',
    shell: true,
    env,
});
process.exit(result.status ?? 1);
