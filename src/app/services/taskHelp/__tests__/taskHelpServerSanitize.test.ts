import { describe, expect, it } from 'vitest';
import { redactPiiText } from '@/app/services/tasks/taskSanitizer';

/**
 * يحاكي enforcePublicSanitization في create/route دون استيراد مسار API.
 */
function enforcePublicSanitization(input: {
    title: string;
    location: string | null;
    instructions?: string;
}) {
    const prefix = '[طلب مساعدة عامة]';
    const cleanedTitle = redactPiiText(input.title) || 'مهمة';
    const title = cleanedTitle.startsWith(prefix)
        ? cleanedTitle
        : `${prefix} ${cleanedTitle}`.trim();
    const location = input.location ? redactPiiText(input.location) || null : null;
    const instructions = input.instructions ? redactPiiText(input.instructions) : undefined;
    return { title: title.slice(0, 500), location, instructions, isSanitised: true as const };
}

describe('server-side public sanitization guard', () => {
    it('strips PII even if client sends unsanitized public payload', () => {
        const out = enforcePublicSanitization({
            title: 'جلسة للموكل سامي رقم القضية 998877665544',
            location: 'محكمة الرصافة',
            instructions: 'اتصل على 07701234567 وأحضر هوية الموكل',
        });
        expect(out.isSanitised).toBe(true);
        expect(out.title.startsWith('[طلب مساعدة عامة]')).toBe(true);
        expect(out.title).not.toContain('سامي');
        expect(out.title).not.toMatch(/998877665544/);
        expect(out.instructions).not.toMatch(/07701234567/);
        expect(out.location).toBe('محكمة الرصافة');
    });
});
