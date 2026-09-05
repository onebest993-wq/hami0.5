import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(rel: string): string {
    return fs.readFileSync(path.join(root, rel), 'utf8');
}

const FOC_MODALS = [
    'src/app/components/lawyer/FinancialOperationsCenter/components/DebtTotalsEditModal.tsx',
    'src/app/components/lawyer/FinancialOperationsCenter/components/FocDisburseModal.tsx',
    'src/app/components/lawyer/FinancialOperationsCenter/components/FocGhuramaaModal.tsx',
    'src/app/components/lawyer/FinancialOperationsCenter/components/FocFeesSheet.tsx',
    'src/app/components/lawyer/FinancialOperationsCenter/components/FocExpenseSheet.tsx',
];

describe('FOC nested modal mobile honesty', () => {
    it('البوابة تسجّل رجوع النظام مرة واحدة لكل نافذة مفتوحة', () => {
        const portal = read(
            'src/app/components/lawyer/FinancialOperationsCenter/components/FocModalPortal.tsx',
        );
        expect(portal).toContain('useOverlayEscapeDismiss');
        expect(portal).toContain('Boolean(open && onBackdropClick)');
    });

    it('أزرار إغلاق النوافذ المتداخلة تستخدم أرضية 44px', () => {
        for (const rel of FOC_MODALS) {
            const src = read(rel);
            expect(src, rel).toContain('FOC_MODAL_CLOSE_BTN');
            expect(src, rel).not.toContain('p-2 rounded-full hover:bg-white/10 text-slate-400');
        }
        const constants = read('src/app/components/lawyer/FinancialOperationsCenter/constants.ts');
        expect(constants).toContain("FOC_MODAL_CLOSE_BTN =");
        expect(constants).toContain('min-h-[44px]');
        expect(constants).toContain('min-w-[44px]');
        expect(constants).toContain('touch-manipulation');
    });

    it('حجز الراتب يبقي الإلغاء/التأكيد فوق 44px حتى بلا زر X', () => {
        const garnish = read(
            'src/app/components/lawyer/FinancialOperationsCenter/components/FocGarnishModal.tsx',
        );
        expect(garnish).toContain('FOC_MODAL_ACTION_BTN');
        expect(garnish).toContain('إلغاء');
        expect(garnish).toContain('تأكيد حجز الراتب');
    });

    it('شارة الكفيل في المركز تلمس 44px وتمرّر الحفظ للأب', () => {
        const body = read(
            'src/app/components/lawyer/FinancialOperationsCenter/components/FocCreditorExpandedBody.tsx',
        );
        const badge = read(
            'src/app/components/lawyer/FinancialOperationsCenter/components/SettlementGuarantorBadge.tsx',
        );
        expect(body).toContain('SettlementGuarantorBadge');
        expect(badge).toContain('foc-amount-guarantor-request');
        expect(badge).toContain('min-h-[44px]');
        expect(badge).toContain('onPersist');
        expect(
            fs.existsSync(path.join(root, 'src/app/components/lawyer/Modal_Guarantor_Registration.tsx')),
        ).toBe(false);
    });
});
