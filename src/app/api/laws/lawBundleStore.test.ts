import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CIVIL_LAW_CANONICAL_NAMES } from '@/app/constants/iraqiLawCatalog';
import {
  devLocalInsertLaw,
  devLocalListLaws,
  shouldUseDevLocalLawsStore,
} from './lawBundleStore.ts';

describe('lawBundleStore', () => {
  let tmpDir = '';

  beforeEach(async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.NODE_ENV = 'test';
    tmpDir = path.join(os.tmpdir(), `hami-law-bundles-${process.pid}-${Date.now()}`);
    process.env.DEV_LAWS_BUNDLE_DIR = tmpDir;
    await fs.mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    delete process.env.DEV_LAWS_BUNDLE_DIR;
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('writes each law to its own bundle file without cross-law leakage', async () => {
    expect(shouldUseDevLocalLawsStore()).toBe(true);

    const civilName = CIVIL_LAW_CANONICAL_NAMES.civil_procedure;
    const evidenceName = CIVIL_LAW_CANONICAL_NAMES.evidence;

    await devLocalInsertLaw({
      law_name: civilName,
      article_number: '1',
      content: 'مرافعات 1',
    });
    await devLocalInsertLaw({
      law_name: evidenceName,
      article_number: '1',
      content: 'إثبات 1',
    });

    const civilRows = await devLocalListLaws(civilName);
    const evidenceRows = await devLocalListLaws(evidenceName);

    expect(civilRows).toHaveLength(1);
    expect(evidenceRows).toHaveLength(1);
    expect(civilRows[0]?.content).toBe('مرافعات 1');
    expect(evidenceRows[0]?.content).toBe('إثبات 1');

    const civilFile = await fs.readFile(path.join(tmpDir, 'civil-procedure.articles.json'), 'utf8');
    const evidenceFile = await fs.readFile(path.join(tmpDir, 'evidence.articles.json'), 'utf8');
    expect(civilFile).toContain('مرافعات 1');
    expect(civilFile).not.toContain('إثبات 1');
    expect(evidenceFile).toContain('إثبات 1');
    expect(evidenceFile).not.toContain('مرافعات 1');
  });
});
