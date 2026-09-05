import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(rel: string): string {
    return fs.readFileSync(path.join(root, rel), 'utf8');
}

describe('ورثة — الاسم فقط + طبقة فوق محضر المتابعة', () => {
    it('تعديل الورثة لا يعرض هاتف/عنوان ويجلس فوق المحضر مع رجوع LIFO', () => {
        const modal = read(
            'src/app/components/lawyer/ExecutionDashboard/components/PartyEditModal.tsx',
        );
        const editor = read(
            'src/app/components/lawyer/ExecutionDashboard/components/PartyEditModalHeirsEditor.tsx',
        );
        expect(modal).toContain('nestedOverFollowUpPortal');
        expect(modal).toContain('data-party-edit-modal');
        expect(modal).toContain('useOverlayEscapeDismiss');
        expect(modal).not.toContain('z-[12000]');
        expect(editor).toContain('placeholder="اسم الوارث..."');
        expect(editor).not.toContain('هاتف الوارث');
        expect(editor).not.toContain('عنوان الوارث');
    });

    it('إحلال الورثة يطلب الاسم فقط ويجلس فوق المحضر', () => {
        const death = read('src/app/components/lawyer/execution/PartyDeathReportModal.tsx');
        expect(death).toContain('nestedOverFollowUpPortal');
        expect(death).toContain('useOverlayEscapeDismiss');
        expect(death).toContain('الرجاء إدراج أسماء الورثة.');
        expect(death).not.toContain('رقم هاتف الوارث');
        expect(death).not.toContain('عنوان الوارث');
        expect(death).not.toContain('الاسم، الهاتف، العنوان');
    });

    it('عرض الورثة السريع يجلس فوق الإضبارة ويعرض الاسم فقط', () => {
        const quick = read(
            'src/app/components/lawyer/ExecutionDashboard/components/ExecutionHeirsQuickViewModal.tsx',
        );
        expect(quick).toContain('nestedOverFollowUpPortal');
        expect(quick).toContain('useOverlayEscapeDismiss');
        expect(quick).toContain('data-heirs-quick-view-modal');
        expect(quick).not.toContain('z-[210]');
        expect(quick).not.toContain('الهاتف');
        expect(quick).not.toContain('العنوان');
    });
});
