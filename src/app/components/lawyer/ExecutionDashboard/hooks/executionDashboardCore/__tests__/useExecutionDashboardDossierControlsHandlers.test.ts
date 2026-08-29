import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ExecutionFile } from '@/app/types/execution';
import type { DossierActionPayload } from '../../../components/DossierActionTypes';
import {
    useExecutionDashboardDossierControlsHandlers,
    type UseExecutionDashboardDossierControlsHandlersParams,
} from '../useExecutionDashboardDossierControlsHandlers';

const appendSpecialFollowupRequestMock = vi.fn();
const createInabaCorrespondenceLogEntryMock = vi.fn();
const getInabaCorrespondenceLogMock = vi.fn();
const patchParentInabaCorrespondenceLogMock = vi.fn();
const buildDossierActionFullContentMock = vi.fn();
const buildDossierActionPayloadJsonMock = vi.fn();
const validateDossierActionPayloadMock = vi.fn();

vi.mock('@/app/utils/specialFollowupDecisionQueue', () => ({
    appendSpecialFollowupRequest: (...args: unknown[]) => appendSpecialFollowupRequestMock(...args),
}));

vi.mock('../../utils/inabaCorrespondenceLog', () => ({
    createInabaCorrespondenceLogEntry: (...args: unknown[]) => createInabaCorrespondenceLogEntryMock(...args),
    getInabaCorrespondenceLog: (...args: unknown[]) => getInabaCorrespondenceLogMock(...args),
    patchParentInabaCorrespondenceLog: (...args: unknown[]) => patchParentInabaCorrespondenceLogMock(...args),
}));

vi.mock('../executionDashboardDossierAction', () => ({
    DOSSIER_ACTION_TITLE_MAP: {
        delegation: 'طلب الإنابة التنفيذية',
        unify: 'طلب توحيد الأضابير',
        transfer: 'طلب نقل الإضبارة',
        renew: 'طلب تجديد الإضبارة',
        inaba_correspondence: 'طلب مخاطبة مديرية الانابة',
    },
    buildDossierActionFullContent: (...args: unknown[]) => buildDossierActionFullContentMock(...args),
    buildDossierActionPayloadJson: (...args: unknown[]) => buildDossierActionPayloadJsonMock(...args),
    validateDossierActionPayload: (...args: unknown[]) => validateDossierActionPayloadMock(...args),
}));

describe('useExecutionDashboardDossierControlsHandlers', () => {
    const baseParams = (): UseExecutionDashboardDossierControlsHandlersParams => ({
        executionData: { id: 'exec-1' } as ExecutionFile,
        decisionsStorageExecutionId: 'exec-1',
        parentExecutionFile: null,
        isInabaActive: false,
        isUnifiedTabActive: false,
        nextTimelineId: () => 'tl-1',
        pushTimelineEvent: vi.fn(),
        persistExecutionMerge: vi.fn(),
        showToast: vi.fn(),
        setDossierActionModalOpen: vi.fn(),
        setDossierActionModalSaving: vi.fn(),
        setDossierActionModalType: vi.fn(),
        setExecutionStorageTick: vi.fn(),
    });

    beforeEach(() => {
        appendSpecialFollowupRequestMock.mockReset();
        createInabaCorrespondenceLogEntryMock.mockReset();
        getInabaCorrespondenceLogMock.mockReset();
        patchParentInabaCorrespondenceLogMock.mockReset();
        buildDossierActionFullContentMock.mockReset();
        buildDossierActionPayloadJsonMock.mockReset();
        validateDossierActionPayloadMock.mockReset();
    });

    it('stops on validation failure and closes saving state', async () => {
        validateDossierActionPayloadMock.mockReturnValue({
            ok: false,
            message: 'بيانات ناقصة',
        });

        const showToast = vi.fn();
        const setDossierActionModalSaving = vi.fn();
        const { result } = renderHook(() =>
            useExecutionDashboardDossierControlsHandlers({
                ...baseParams(),
                showToast,
                setDossierActionModalSaving,
            }),
        );

        const payload: DossierActionPayload = { actionType: 'transfer' };

        await act(async () => {
            await result.current.handleDossierAction(payload);
        });

        expect(showToast).toHaveBeenCalledWith('بيانات ناقصة', 'warning');
        expect(setDossierActionModalSaving).toHaveBeenCalledWith(false);
        expect(appendSpecialFollowupRequestMock).not.toHaveBeenCalled();
    });

    it('sends inaba correspondence, persists log, and pushes timeline event', async () => {
        validateDossierActionPayloadMock.mockReturnValue({ ok: true });
        buildDossierActionFullContentMock.mockReturnValue('محتوى الطلب');
        buildDossierActionPayloadJsonMock.mockReturnValue('{"kind":"inaba"}');
        appendSpecialFollowupRequestMock.mockReturnValue('decision-1');
        const pushTimelineEvent = vi.fn();
        const persistExecutionMerge = vi.fn();
        const showToast = vi.fn();
        const setDossierActionModalOpen = vi.fn();
        const setDossierActionModalSaving = vi.fn();
        const setExecutionStorageTick = vi.fn();

        const { result } = renderHook(() =>
            useExecutionDashboardDossierControlsHandlers({
                ...baseParams(),
                pushTimelineEvent,
                persistExecutionMerge,
                showToast,
                setDossierActionModalOpen,
                setDossierActionModalSaving,
                setExecutionStorageTick,
            }),
        );

        const payload: DossierActionPayload = {
            actionType: 'inaba_correspondence',
            inabaCorrespondenceSubFileId: 'sub-1',
            inabaCorrespondenceDirectorate: 'بغداد',
            inabaCorrespondenceSubject: 'استفسار',
        };

        await act(async () => {
            await result.current.handleDossierAction(payload);
        });

        expect(appendSpecialFollowupRequestMock).toHaveBeenCalledWith(
            expect.objectContaining({
                executionId: 'exec-1',
                decisionTitle: 'طلب مخاطبة مديرية الانابة',
                payloadJson: '{"kind":"inaba"}',
            }),
        );
        expect(persistExecutionMerge).toHaveBeenCalledWith(
            expect.objectContaining({
                inaba_correspondence_log: [
                    expect.objectContaining({
                        decisionRowId: 'decision-1',
                        subFileId: 'sub-1',
                        directorate: 'بغداد',
                        subject: 'استفسار',
                    }),
                ],
            }),
        );
        expect(pushTimelineEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                title: 'طلب مخاطبة مديرية الانابة — قيد البت',
            }),
        );
        expect(setExecutionStorageTick).toHaveBeenCalled();
        expect(setDossierActionModalOpen).toHaveBeenCalledWith(false);
        expect(setDossierActionModalSaving).toHaveBeenCalledWith(false);
        expect(showToast).toHaveBeenCalledWith(
            'تم إرسال "طلب مخاطبة مديرية الانابة" إلى القرارات والطعون بانتظار الموافقة.',
            'success',
        );
    });
});
