import { describe, expect, it } from 'vitest';
import { VOICE_POST_DEFAULT_CONTENT } from '../communityScreenConstants';
import {
    parseForumManualTags,
    resolveForumPostPublishContent,
} from '../communityAddQuestionPublishGuard';

describe('communityAddQuestionPublishGuard', () => {
    it('يرفض النص القصير بلا صوت', () => {
        expect(resolveForumPostPublishContent('قصير', false)).toEqual({
            ok: false,
            reason: 'too_short',
        });
    });

    it('يقبل النص الكافي ويستخدم نص الصوت الافتراضي', () => {
        expect(resolveForumPostPublishContent('استشارة قانونية واضحة', false)).toEqual({
            ok: true,
            content: 'استشارة قانونية واضحة',
        });
        expect(resolveForumPostPublishContent('  ', true)).toEqual({
            ok: true,
            content: VOICE_POST_DEFAULT_CONTENT,
        });
    });

    it('يفصل الوسوم اليدوية', () => {
        expect(parseForumManualTags('مدني, أحوال  جزائي', (value) => value)).toEqual([
            'مدني',
            'أحوال',
            'جزائي',
        ]);
    });
});
