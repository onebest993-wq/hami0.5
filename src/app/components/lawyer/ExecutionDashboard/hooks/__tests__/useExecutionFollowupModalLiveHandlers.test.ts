import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useExecutionFollowupModalLiveHandlers } from '../useExecutionFollowupModalLiveHandlers';

describe('useExecutionFollowupModalLiveHandlers', () => {
    it('البوابة تقرأ runSpecialFollowupSubmit من اللقطة وليس مفتاحاً ميتاً', () => {
        const portal = readFileSync(
            join(
                process.cwd(),
                'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionFollowupModalPortalController.ts',
            ),
            'utf8',
        );
        const live = readFileSync(
            join(
                process.cwd(),
                'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionFollowupModalLiveHandlers.ts',
            ),
            'utf8',
        );
        expect(portal).toContain('runSpecialFollowupSubmit: followup.runSpecialFollowupSubmit');
        expect(portal).not.toContain('submitSpecialFollowupRequest');
        expect(live).toContain('runSpecialFollowupSubmitRef');
        expect(live).not.toContain('submitSpecialFollowupRequest');
    });

    it('يستدعي المعالج الحي فوراً دون انتظار الجسر', () => {
        const runSpecialFollowupSubmit = vi.fn();
        const showToast = vi.fn();
        const { result } = renderHook(() =>
            useExecutionFollowupModalLiveHandlers({
                handleDossierAction: undefined,
                runSpecialFollowupSubmit,
                isRepresentingDebtor: false,
                showToast,
                setDossierActionModalSaving: vi.fn(),
            }),
        );

        result.current.handleSpecialFollowupSubmit();

        expect(runSpecialFollowupSubmit).toHaveBeenCalledTimes(1);
        expect(showToast).not.toHaveBeenCalled();
    });

    it('يمنع وكيل المدين من طلبات الإدارة الخاصة', () => {
        const runSpecialFollowupSubmit = vi.fn();
        const showToast = vi.fn();
        const { result } = renderHook(() =>
            useExecutionFollowupModalLiveHandlers({
                handleDossierAction: undefined,
                runSpecialFollowupSubmit,
                isRepresentingDebtor: true,
                showToast,
                setDossierActionModalSaving: vi.fn(),
            }),
        );

        result.current.handleSpecialFollowupSubmit();

        expect(runSpecialFollowupSubmit).not.toHaveBeenCalled();
        expect(showToast).toHaveBeenCalledWith(
            'غير متاح لوكيل المدين: طلبات الإدارة الخاصة',
            'warning',
        );
    });
});
