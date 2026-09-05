import { describe, expect, it } from 'vitest';
import { createForumEntityId } from '@/app/services/forum/forumEntityIdCore';
import { mintForumEntityId } from '@/app/services/forum/forumPostCreateGuard';
import { newForumEntityId } from '@/app/components/lawyer/CommunityScreen/forumEntityId';

describe('معرّف كيان المنتدى', () => {
    it('الواجهة والحارس نفس الدالة', () => {
        expect(newForumEntityId).toBe(createForumEntityId);
        expect(mintForumEntityId).toBe(createForumEntityId);
        const a = createForumEntityId();
        const b = mintForumEntityId();
        expect(a).not.toBe(b);
        expect(a.length).toBeGreaterThan(8);
        expect(b.length).toBeGreaterThan(8);
    });
});
