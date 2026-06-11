import { describe, expect, it } from 'vitest';

/** اختبار منطق الخيارات — نستورد الدالة الداخلية عبر نفس مسار الوحدة */
import { useExecutionCreationFormOptions } from '../useExecutionCreationFormOptions';
import { renderHook } from '@testing-library/react';

describe('useExecutionCreationFormOptions', () => {
    it('includes specific delivery in civil court judgments', () => {
        const { result } = renderHook(() =>
            useExecutionCreationFormOptions('قرارات وأحكام المحاكم', 'مدني', '', [])
        );
        const values = result.current.claimTypeOptionsList.map((o) => o.value);
        expect(values).toContain('تسليم شيء معين');
        expect(values).toContain('استحصال دين مالي');
        expect(values).toHaveLength(4);
    });

    it('keeps specific delivery for certified arbitrator decisions', () => {
        const { result } = renderHook(() =>
            useExecutionCreationFormOptions('قرارات المحكمين المصدقة', '', '', [])
        );
        const values = result.current.claimTypeOptionsList.map((o) => o.value);
        expect(values).toContain('تسليم شيء معين');
    });
});
