import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('execution archive list — no decrypt on first paint', () => {
    it('إصابة كاش التخزين لا تفك بلوب الإضبارة لمجرد التحقق من الوجود', () => {
        const src = read('src/app/utils/storageCache.ts');
        expect(src).toContain('peekMemory');
        expect(src).not.toContain('executionDossierValueExistsInStorage');
        const hit = src.slice(src.indexOf('if (cached) {'), src.indexOf('const value = this.readFromLocalStorage'));
        expect(hit).toContain('return cached.value');
        expect(hit).not.toContain('hasItemSync');
        expect(hit).not.toMatch(/readExecutionDossierBlob\(/);
    });

    it('قائمة المخزن تقرأ الذاكرة فقط وعدّ الاختصاص من الفهرس', () => {
        const utils = read('src/app/components/lawyer/ArchivePortal/utils.ts');
        expect(utils).toContain('allowDisk');
        expect(utils).toContain('peekMemory');
        const snap = utils.slice(utils.indexOf('export function readExecutionFileLiveSnapshot'));
        expect(snap).toContain('options?.allowDisk === true');
        expect(snap).toContain('peekMemory');

        const filters = read('src/app/components/lawyer/ArchivePortal/executionArchiveFilterUtils.ts');
        expect(filters).not.toContain("from './utils'");
        expect(filters).not.toMatch(/readExecutionFileLiveSnapshot\(/);
        expect(filters).not.toContain('executionFormUtils');
        expect(filters).not.toContain("from '@/app/utils/storageCache'");
        expect(filters).not.toContain('SecureStoreService');
        const counts = filters.slice(filters.indexOf('export function buildExecutionJurisdictionCounts'));
        const countsBody = counts.slice(0, counts.indexOf('export function matchesExecutionArchiveSearch'));
        expect(countsBody).toContain('isShariaExecutionArchiveIndexHint');
        expect(countsBody).not.toContain('matchesExecutionJurisdictionFilter');
    });

    it('مراجعة البطاقة الحية لا تعيد فك كل الصفوف عند focus النافذة', () => {
        const rev = read(
            'src/app/components/lawyer/ArchivePortal/hooks/useExecutionArchiveCardLiveRevision.ts',
        );
        expect(rev).toContain('hami-unified-ledger-updated');
        expect(rev).not.toContain("addEventListener('focus'");
    });
});
