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
 * عقد shellAuth.ts المقصود (fail-closed):
 * - تجاوز صريح عبر VITE_SHELL_AUTH_OPEN=true|false ولا شيء غيره
 * - الافتراضي خارج الإنتاج فقط: PROD !== true
 * - ممنوع أي مسار يفتح الإنتاج ضمنياً
 *
 * كان العقد السابق يشترط isStaticSpaProduction: أي أن الإنتاج يُفتح كلّما لم
 * يساوِ VITE_BFF_AUTH القيمة 'true' بالضبط، فنسيان متغيّر بيئة واحد يُلغي
 * تسجيل الدخول عن التطبيق كلّه. الحارس الآن يمنع عودة ذلك المسار.
 */
const shellAuth = fs.readFileSync(path.join(ROOT, 'src/app/services/auth/shellAuth.ts'), 'utf8');
const hasExplicitFlag =
  shellAuth.includes("flag === 'true'") && shellAuth.includes("flag === 'false'");
const hasNonProdDefault = shellAuth.includes('PROD !== true');
const hasImplicitOpenPath =
  shellAuth.includes('isStaticSpaProduction') || shellAuth.includes("VITE_BFF_AUTH !== 'true'");

if (!hasExplicitFlag || !hasNonProdDefault) {
  console.error(
    '[guard-shell-auth-prod] BLOCKED: shellAuth.ts missing the fail-closed contract ' +
      '(need explicit VITE_SHELL_AUTH_OPEN true/false and a PROD !== true default)',
  );
  failed = true;
} else if (hasImplicitOpenPath) {
  console.error(
    '[guard-shell-auth-prod] BLOCKED: shellAuth.ts reintroduced an implicit production bypass ' +
      '(isStaticSpaProduction / VITE_BFF_AUTH fallback) — production must open only on an explicit flag',
  );
  failed = true;
} else {
  console.log('[guard-shell-auth-prod] OK shellAuth.ts fail-closed contract');
}

/**
 * Netlify: الفتح مسموح في المعاينات وفروع التجربة وحدها.
 *
 * [build.environment] يسري على كل السياقات بما فيها الإنتاج، فوضع العلم فيه
 * كان يفتح نطاق الإنتاج للجميع. لذلك يُفحص هذا الجدول وجدول الإنتاج معاً.
 */
const netlifyPath = path.join(ROOT, 'netlify.toml');
if (fs.existsSync(netlifyPath)) {
  const toml = fs.readFileSync(netlifyPath, 'utf8');
  const blockOf = (header) =>
    toml.match(new RegExp(`\\[${header.replace(/[.[\]]/g, '\\$&')}\\]([\\s\\S]*?)(?=\\n\\[|\\n*$)`))?.[1] ?? '';
  const isOpen = (block) => /VITE_SHELL_AUTH_OPEN\s*=\s*"true"/i.test(block);
  const isClosed = (block) => /VITE_SHELL_AUTH_OPEN\s*=\s*"false"/i.test(block);

  const buildEnv = blockOf('build.environment');
  const prodEnv = blockOf('context.production.environment');

  if (isOpen(buildEnv)) {
    console.error(
      '[guard-shell-auth-prod] BLOCKED: netlify.toml [build.environment] sets VITE_SHELL_AUTH_OPEN="true" — it applies to every context including production',
    );
    failed = true;
  } else if (isOpen(prodEnv)) {
    console.error(
      '[guard-shell-auth-prod] BLOCKED: netlify.toml [context.production.environment] sets VITE_SHELL_AUTH_OPEN="true"',
    );
    failed = true;
  } else if (isClosed(prodEnv) || isClosed(buildEnv)) {
    console.log('[guard-shell-auth-prod] OK netlify.toml production context closed');
  } else {
    console.log('[guard-shell-auth-prod] OK netlify.toml (no open flag on the production path)');
  }
}

process.exit(failed ? 1 : 0);
