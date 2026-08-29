#!/usr/bin/env node
/**
 * يتحقق أن سلسلة WIFE audit حقيقية — ملفات + JSON reports + patch حرج.
 * Usage: node scripts/verify-wife-audit-chain.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

function mustExist(rel) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) throw new Error(`missing file: ${rel}`);
  return full;
}

function readJson(rel) {
  return JSON.parse(fs.readFileSync(mustExist(rel), 'utf8'));
}

const failures = [];

try {
  const requiredFiles = [
    'e2e/wife-assault-ultimate.spec.ts',
    'e2e/wife-assault-destructive-guard.spec.ts',
    'e2e/wife-gotrue-staging.spec.ts',
    'e2e/fixtures/wife-protected-routes.json',
    'src/app/api/security/wifeCsrfSubjectBinding.test.ts',
    'src/app/security/__tests__/wifeRouteCatalogIntegrity.test.ts',
    'src/app/runtime/__tests__/capacitorWifeSecurityPrep.test.ts',
    'scripts/run-wife-red-team-campaign.mjs',
    'scripts/run-wife-professional-audit.mjs',
    'scripts/verify-wife-prod-readiness.mjs',
  ];
  for (const f of requiredFiles) mustExist(f);

  const csrfSrc = fs.readFileSync(
    path.join(ROOT, 'src/app/api/security/wifeCsrfVerify.ts'),
    'utf8',
  );
  if (!csrfSrc.includes('getVerifiedTokenSubject') || !csrfSrc.includes('validateCsrfForSubject(verifiedSub')) {
    failures.push('WIFE-009 patch missing in wifeCsrfVerify.ts');
  }

  const catalog = readJson('e2e/fixtures/wife-protected-routes.json');
  if ((catalog.protected?.length ?? 0) < 85) {
    failures.push(`catalog protected hits too low: ${catalog.protected?.length}`);
  }

  const campaign = readJson('.audit/WIFE_RED_TEAM_CAMPAIGN_LATEST.json');
  if (campaign.passed !== campaign.total || campaign.total < 14) {
    failures.push(`campaign not 14/14: ${campaign.passed}/${campaign.total}`);
  }

  const audit = readJson('.audit/WIFE_PROFESSIONAL_AUDIT_LATEST.json');
  if (audit.passed !== audit.total || audit.total < 7) {
    failures.push(`professional audit not 7/7: ${audit.passed}/${audit.total}`);
  }
  if ((audit.failed?.length ?? 0) > 0) {
    failures.push(`professional audit failed stages: ${audit.failed.map((f) => f.label).join(', ')}`);
  }

  const readiness = readJson('.audit/WIFE_PROD_READINESS_LATEST.json');
  if (!readiness.codeGateDev?.ok) {
    failures.push('prod readiness: gate:dev not ok');
  }
} catch (err) {
  failures.push(err instanceof Error ? err.message : String(err));
}

const report = {
  stamp: new Date().toISOString(),
  ok: failures.length === 0,
  failures,
  evidence: {
    campaign: '.audit/WIFE_RED_TEAM_CAMPAIGN_LATEST.json',
    professionalAudit: '.audit/WIFE_PROFESSIONAL_AUDIT_LATEST.json',
    prodReadiness: '.audit/WIFE_PROD_READINESS_LATEST.json',
  },
};

const out = path.join(ROOT, '.audit', 'WIFE_AUDIT_CHAIN_LATEST.json');
fs.writeFileSync(out, JSON.stringify(report, null, 2));

console.log('\n── WIFE Audit Chain Verification ──');
if (report.ok) {
  console.log('✓ All chain checks passed (files + JSON + WIFE-009 patch)');
} else {
  for (const f of failures) console.log(`✗ ${f}`);
}
console.log(`Report: ${out}`);

process.exit(report.ok ? 0 : 1);
