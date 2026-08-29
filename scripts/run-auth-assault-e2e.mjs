#!/usr/bin/env node
/**
 * Auth onboarding assault E2E على dev server.
 * مسارات /api/* تُخدم عبر Vite ssrLoadModule — vite preview ثابت فيُرجع 404.
 *
 *   npm run test:e2e:auth-assault
 *   npm run test:e2e:auth-assault -- --full
 */
import { spawnSync } from 'node:child_process';
import { resolveE2ePlatformProjects } from './e2e-platform-projects.mjs';

const extra = process.argv.slice(2);
const full = extra.includes('--full') || extra.includes('--all-platforms');
const rest = extra.filter((a) => a !== '--full' && a !== '--all-platforms');
const explicitProject = rest.some((a) => a.startsWith('--project'));

const env = {
    ...process.env,
    E2E_USE_PREVIEW: '0',
    PW_WORKERS: process.env.PW_WORKERS ?? '1',
    ...(full ? { E2E_BOOT_FULL: '1' } : {}),
};

const projects = explicitProject
    ? rest.filter((a) => a.startsWith('--project'))
    : await resolveE2ePlatformProjects({
          allPlatforms: full,
          includeDesktopExtras: full,
          logPrefix: '[auth-assault-e2e]',
      });

const restNoProject = rest.filter((a) => !a.startsWith('--project'));

console.log('[auth-assault-e2e] Vite dev API (E2E_USE_PREVIEW=0)');

const result = spawnSync(
    'npx',
    [
        'playwright',
        'test',
        'e2e/auth-onboarding-assault.spec.ts',
        '--workers=1',
        ...projects,
        ...restNoProject,
    ],
    { stdio: 'inherit', shell: true, env },
);
process.exit(result.status ?? 1);
