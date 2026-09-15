import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CoerciveTabNonEvictionBody } from '../CoerciveTabNonEvictionBody';
import { ExecutionCoerciveStandardBranch } from '../ExecutionCoerciveStandardBranch';

/**
 * **نصُّ الإرشاد لا يُرسل المحامي إلى زرٍّ غير موجود.**
 *
 * «طلب الكفيل» لا مدخلَ له في محضر المتابعة منذ `f2fdef53`: `shouldListGuarantorRequestInHiddenRequests`
 * و`shouldShowGuarantorRequestInSeizureTab` كلتاهما `return false` («الشارة من التسوية فقط»)، والمدخلُ
 * الحيّ الوحيد شارةٌ في مركز العمليات المالية بعد إخلالٍ بتسوية. وكان شريطان يقولان غير ذلك: شريطُ
 * المدين الموظّف — والموظّفُ ممنوعٌ من كفيل المبلغ أصلاً — وشريطُ المدين الكاسب.
 *
 * **ويُشترط أوّلاً أنّ الشريط رُسم**، وإلا مرّ «لا يحتوي» على شاشةٍ فارغة.
 */

describe('guarantor-request guidance copy', () => {
    it('employee financial banner does not point to a guarantor request in the follow-up record', () => {
        const props = {
            followupEmployeeFinancialSalaryOnlyCoercive: true,
            hideCoerciveFinancialBanners: false,
            needsSpecificDeliveryNatureSetup: false,
            showEncroachmentCards: false,
            encroachmentExecutionId: '',
            showSpecificDeliveryProceduresBlock: false,
            showSpecificDeliveryFieldProcedures: false,
            isMaritalFurnitureClaim: false,
        } as unknown as React.ComponentProps<typeof CoerciveTabNonEvictionBody>;

        const { container } = render(<CoerciveTabNonEvictionBody {...props} />);
        const text = container.textContent ?? '';

        expect(text).toContain('تنفيذ مالي ومدين موظف');
        expect(text).not.toContain('طلب الكفيل');
    });

    it('freelancer best-action banner does not point to a guarantor request in the personal coercive tab', () => {
        const props = {
            daysSinceNoticeCalculated: 8,
            remaining: 1_000_000,
            isDebtorGovernmentEmployee: false,
            isDebtorFreelancer: true,
            isNonFinancialClaim: false,
            activeDebtorIsEmployee: false,
            handleCoerciveAction: vi.fn(),
            closeCoerciveModal: vi.fn(),
            showToast: vi.fn(),
        } as unknown as React.ComponentProps<typeof ExecutionCoerciveStandardBranch>;

        const { container } = render(<ExecutionCoerciveStandardBranch {...props} />);
        const text = container.textContent ?? '';

        expect(text).toContain('التنفيذ الجبري الشخصي');
        expect(text).not.toContain('طلب الكفيل');
    });
});
