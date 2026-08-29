import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('useCommunityGroupPostsFeed source', () => {
    it('سلسلة التحميل بدون فاصلة منقوطة قبل .then (يكسر esbuild)', () => {
        const src = readFileSync(
            resolve(
                process.cwd(),
                'src/app/components/lawyer/CommunityScreen/hooks/useCommunityGroupPostsFeed.ts',
            ),
            'utf8',
        );
        expect(src).toContain(
            'void ForumApiService.listPostsPaginated(pageSize, 0, { groupId: activeGroupId })',
        );
        expect(src).not.toContain(
            'void ForumApiService.listPostsPaginated(pageSize, 0, { groupId: activeGroupId });',
        );
        expect(src).toMatch(
            /listPostsPaginated\(pageSize, 0, \{ groupId: activeGroupId \}\)\s*\n\s*\.then\(/,
        );
    });
});
