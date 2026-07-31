/**
 * بوابة خفيفة: VITE_SHELL_AUTH_OPEN يجب ألا يكون true في مسارات الإنتاج.
 * عقد الكود يطابق `shellAuth.ts` الحي (لا نص أحفوري).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = ['.env.production', '.env.production.example', '.env.example'];
let failed = false;

for (const rel of files) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) continue;
  const text = fs.readFileSync(p, 'utf8');
  const openTrue = /^\s*VITE_SHELL_AUTH_OPEN\s*=\s*true\s*$/im.test(text);
  if (openTrue && /production/i.test(rel)) {
    console.error(`[guard-shell-auth-prod] BLOCKED: ${rel} sets VITE_SHELL_AUTH_OPEN=true`);
    failed = true;
  } else {
    console.log(`[guard-shell-auth-prod] OK ${rel}`);
  }
}

/**
 * عقد shellAuth.ts المقصود:
 * - تجاوز صريح عبر VITE_SHELL_AUTH_OPEN=true|false
 * - DEV مفتوح افتراضياً
 * - إنتاج SPA ثابت بدون VITE_BFF_AUTH=true مفتوح للمعاينة (isStaticSpaProduction)
 * - إنتاج مع BFF لا يفتح إلا بعلم صريح (flag === 'true')
 */
const shellAuth = fs.readFileSync(path.join(ROOT, 'src/app/services/auth/shellAuth.ts'), 'utf8');
const hasExplicitFlag =
  shellAuth.includes("flag === 'true'") && shellAuth.includes("flag === 'false'");
const hasStaticSpaGate =
  shellAuth.includes('isStaticSpaProduction') &&
  shellAuth.includes("VITE_BFF_AUTH !== 'true'");
const hasNonProdDefault = shellAuth.includes('PROD !== true');

if (!hasExplicitFlag || !hasStaticSpaGate || !hasNonProdDefault) {
  console.error(
    '[guard-shell-auth-prod] BLOCKED: shellAuth.ts missing production bypass contract ' +
      '(need explicit VITE_SHELL_AUTH_OPEN true/false, isStaticSpaProduction + BFF gate, PROD !== true default)',
  );
  failed = true;
} else {
  console.log('[guard-shell-auth-prod] OK shellAuth.ts contract');
}

// Netlify: [build.environment] يجب أن يكون مغلقاً؛ الفتح مسموح فقط في preview/branch
const netlifyPath = path.join(ROOT, 'netlify.toml');
if (fs.existsSync(netlifyPath)) {
  const toml = fs.readFileSync(netlifyPath, 'utf8');
  const buildEnvMatch = toml.match(
    /\[build\.environment\]([\s\S]*?)(?=\n\[|\n*$)/,
  );
  const buildEnv = buildEnvMatch?.[1] ?? '';
  const buildOpenTrue = /VITE_SHELL_AUTH_OPEN\s*=\s*"true"/i.test(buildEnv);
  if (buildOpenTrue) {
    console.error(
      '[guard-shell-auth-prod] BLOCKED: netlify.toml [build.environment] sets VITE_SHELL_AUTH_OPEN="true" (production path)',
    );
    failed = true;
  } else if (/VITE_SHELL_AUTH_OPEN\s*=\s*"false"/i.test(buildEnv)) {
    console.log('[guard-shell-auth-prod] OK netlify.toml [build.environment] closed');
  } else {
    console.log('[guard-shell-auth-prod] OK netlify.toml (no open flag in build.environment)');
  }
}

process.exit(failed ? 1 : 0);
