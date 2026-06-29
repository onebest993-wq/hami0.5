import { describe, expect, it } from 'vitest';
import { computeAllowedUpvoterIds, resolveSyncBestCommentId } from '../forumPostSyncGuard';

describe('computeAllowedUpvoterIds', () => {
    it('يسمح بتبديل تصويت المصوّت الحالي فقط', () => {
        const add = computeAllowedUpvoterIds(['a'], ['a', 'user-1'], 'user-1');
        expect(add.ok).toBe(true);
        if (add.ok) {
            expect(add.upvoterIds).toEqual(['a', 'user-1']);
            expect(add.changed).toBe(true);
        }

        const remove = computeAllowedUpvoterIds(['a', 'user-1'], ['a'], 'user-1');
        expect(remove.ok).toBe(true);
        if (remove.ok) {
            expect(remove.upvoterIds).toEqual(['a']);
        }
    });

    it('يرفض حقن معرّفات تصويت أجنبية', () => {
        const res = computeAllowedUpvoterIds(['a'], ['a', 'attacker', 'user-1'], 'user-1');
        expect(res.ok).toBe(false);
    });

    it('يرفض حذف تصويت مستخدم آخر', () => {
        const res = computeAllowedUpvoterIds(['a', 'other'], ['a'], 'user-1');
        expect(res.ok).toBe(false);
    });
});

describe('resolveSyncBestCommentId', () => {
    it('يسمح لصاحب المنشور بتغيير أفضل إجابة', () => {
        const res = resolveSyncBestCommentId(null, 'c1', true, false);
        expect(res.ok).toBe(true);
        if (res.ok) expect(res.bestCommentId).toBe('c1');
    });

    it('يرفض تغيير أفضل إجابة من غير المالك', () => {
        const res = resolveSyncBestCommentId(null, 'c1', false, false);
        expect(res.ok).toBe(false);
    });
});
