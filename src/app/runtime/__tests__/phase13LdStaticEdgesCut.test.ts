import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

describe('phase-13 remaining LD static edges', () => {
    it('lawyerProfileCloud يستخدم bridge/lite فقط', () => {
        const src = readFileSync(
            join(root, 'src/app/services/cloud/lawyerProfileCloud.ts'),
            'utf8',
        );
        expect(src).toContain("from '@/app/services/calendar/bridge/lite'");
        expect(src.includes("from '@/app/services/calendar/bridge'")).toBe(false);
    });

    it('Escape التنفيذ لا يستورد executionDashboardStore بشكل متزامن', () => {
        const src = readFileSync(
            join(root, 'src/app/hooks/lawyerDashboard/useLawyerExecutionOverlayEscape.ts'),
            'utf8',
        );
        expect(src.includes("from '@/app/stores/executionDashboardStore'")).toBe(false);
        expect(src).toContain("import('@/app/stores/executionDashboardStore')");
    });

    // حُذف فحص lawyerCommunityPostsStorage: كان يحرس حدّ استيراد في جزيرة ميتة
    // (Api + PostsMerge + PostsStorage) خلّفتها إعادة هيكلة لم تكتمل، بينما
    // الخدمة الحيّة lawyerCommunityCloud لم تستوردها قط.
});
