import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('data-is-not-code honesty — سبب البيانات', () => {
    it('آخر قسم يطلق طبقة البيانات مع الكِسرة لا بعدها', () => {
        const recency = read('src/app/runtime/sectionChunkRecency.ts');
        expect(recency).toContain('sectionChunkDataWarm');
        expect(recency).toContain('warmSectionData');
        const dataIdx = recency.indexOf('warmSectionData');
        const jsIdx = recency.lastIndexOf('preloadSectionChunk');
        expect(dataIdx).toBeGreaterThan(0);
        expect(jsIdx).toBeGreaterThan(dataIdx);
    });

    it('المنتدى يبدأ كاش المنشورات مع تحليل الشيفرة', () => {
        const hydrator = read('src/app/runtime/communityBootHydrator.ts');
        const postsIdx = hydrator.indexOf('const postsWarm = maybeWarmPosts()');
        const jsIdx = hydrator.indexOf('hydrateCommunityScreenForInstantOpen()');
        expect(postsIdx).toBeGreaterThan(0);
        expect(jsIdx).toBeGreaterThan(postsIdx);
        expect(hydrator).toContain('المنشورات مع تحليل الشيفرة');
    });

    it('قائمة التنفيذ لا تفك بلوب الإضبارة', () => {
        const data = read('src/app/runtime/sectionChunkDataWarm.ts');
        expect(data).toContain('ensureExecutionIndexReady');
        expect(data).not.toContain('readExecutionDossierBlob');
        expect(data).not.toContain('decryptData');
        expect(data).toContain('startLawsuitFilesEagerHydrate');
        expect(data).toContain('warmForumPostsCacheFromLocal');
        expect(data).toContain('warmTransactionsDiskRead');
    });
});
