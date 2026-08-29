import { useCallback, type Dispatch, type SetStateAction } from 'react';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { buildNoResponseConfirmationDetails } from '../communicationDecisionModel';
import { validateCommunicationResultDraft } from '../../helpers/communicationResultValidation';
import type {
    CommunicationAwaitingUiState,
    CommunicationResultDraft,
} from './communicationsTabTypes';
import type { TimelineEvent } from '@/app/types/execution';

type ShowToast = (
    message: string,
    type: 'success' | 'error' | 'warning' | 'info',
) => void;

export function useCommunicationsTabResultHandlers(deps: {
    saving: boolean;
    setSaving: (v: boolean) => void;
    storageExecutionId: string;
    showToast: ShowToast;
    applyCommunicationDecisionPatch: (decisionId: string, patch: Record<string, unknown>) => boolean;
    pushTimelineEvent: (event: TimelineEvent | Record<string, unknown>) => void;
    nextTimelineId: () => string;
    setAwaitingUiById: Dispatch<SetStateAction<Record<string, CommunicationAwaitingUiState>>>;
}) {
    const {
        saving,
        setSaving,
        storageExecutionId,
        showToast,
        applyCommunicationDecisionPatch,
        pushTimelineEvent,
        nextTimelineId,
        setAwaitingUiById,
    } = deps;

    const saveCommunicationResult = useCallback(
        (decisionId: string, directorate: string, draft: CommunicationResultDraft) => {
            if (saving) return;
            if (!storageExecutionId || !decisionId) {
                showToast('تعذّر الحفظ — معرّف الإضبارة غير جاهز', 'error');
                return;
            }
            const validation = validateCommunicationResultDraft(draft);
            if (!validation.ok) {
                showToast(validation.message, 'warning');
                return;
            }
            setSaving(true);
            const now = new Date().toISOString();
            const ref = [String(draft.letterDate || '').trim(), String(draft.letterNum || '').trim()]
                .filter(Boolean)
                .join(' ');
            const patch = {
                deputationTargetDirectorate: String(draft.purpose || '').trim(),
                deputationReferralDate: ref || undefined,
                deputationResultDetails: String(draft.result || '').trim(),
                deputationClosed: true,
                deputationSent: true,
                deputationNoResponseConfirmed: false,
            } as Record<string, unknown>;
            const ok = applyCommunicationDecisionPatch(decisionId, patch);
            if (!ok) {
                setSaving(false);
                showToast('تعذّر حفظ النتيجة — أعد المحاولة أو افتح مركز القرارات.', 'error');
                return;
            }
            try {
                pushTimelineEvent({
                    id: nextTimelineId(),
                    type: 'communication',
                    title: `نتيجة مخاطبة — ${directorate}`,
                    description: [ref ? `مرجع: ${ref}` : '', String(draft.result || '').trim()]
                        .filter(Boolean)
                        .join('\n'),
                    date: now.slice(0, 10),
                    timestamp: now,
                    source: 'محضر المتابعة',
                    metadata: {
                        timelineThreadKey: `executor_decision:${decisionId}`,
                        decisionRowId: decisionId,
                    },
                });
            } catch {
                /* ignore */
            }
            setAwaitingUiById((prev) => {
                const next = { ...prev };
                delete next[decisionId];
                return next;
            });
            setSaving(false);
            showToast('✅ تم حفظ النتيجة الواردة', 'success');
        },
        [
            applyCommunicationDecisionPatch,
            storageExecutionId,
            nextTimelineId,
            pushTimelineEvent,
            saving,
            setAwaitingUiById,
            setSaving,
            showToast,
        ],
    );

    const dismissFollowup = useCallback(
        (decisionId: string) => {
            if (saving) return;
            if (!storageExecutionId || !decisionId) {
                showToast('تعذّر التجاهل — معرّف الإضبارة غير جاهز', 'error');
                return;
            }
            setSaving(true);
            const patch = {
                deputationFollowupDismissed: true,
                deputationClosed: true,
                deputationResultDetails: 'تم تجاهل متابعة نتيجة المخاطبة.',
            } as Record<string, unknown>;
            const ok = applyCommunicationDecisionPatch(decisionId, patch);
            if (!ok) {
                setSaving(false);
                showToast('تعذّر التجاهل — أعد المحاولة أو افتح مركز القرارات.', 'error');
                return;
            }
            setAwaitingUiById((prev) => {
                const next = { ...prev };
                delete next[decisionId];
                return next;
            });
            setSaving(false);
            showToast('تم تجاهل متابعة النتيجة', 'info');
        },
        [
            applyCommunicationDecisionPatch,
            storageExecutionId,
            saving,
            setAwaitingUiById,
            setSaving,
            showToast,
        ],
    );

    const confirmNoResponse = useCallback(
        (
            decisionId: string,
            directorate: string,
            letterDateForLetter: string,
            options?: { editedLetterDate?: string; editedBody?: string },
        ) => {
            if (saving) return;
            if (!storageExecutionId || !decisionId) {
                showToast('تعذّر التسجيل — معرّف الإضبارة غير جاهز', 'error');
                return;
            }
            setSaving(true);
            const confirmationDate = getLocalTodayYmd();
            const previousLetterDate = String(
                options?.editedLetterDate || letterDateForLetter || '',
            ).trim();
            const details = buildNoResponseConfirmationDetails({
                previousLetterDate,
                confirmationDate,
            });
            const patch: Record<string, unknown> = {
                deputationNoResponseConfirmed: true,
                deputationReferralDate: confirmationDate,
                deputationResultDetails: details,
            };
            const editedBody = String(options?.editedBody || '').trim();
            if (options?.editedLetterDate) {
                patch.date = options.editedLetterDate;
            }
            if (editedBody) {
                patch.body = `بتاريخ ${previousLetterDate}:\n\n${editedBody}`;
            }
            const ok = applyCommunicationDecisionPatch(decisionId, patch);
            if (!ok) {
                setSaving(false);
                showToast('تعذّر حفظ التأكيد — أعد المحاولة أو افتح مركز القرارات.', 'error');
                return;
            }
            try {
                const now = new Date().toISOString();
                pushTimelineEvent({
                    id: nextTimelineId(),
                    type: 'communication',
                    title: `تأكيد — عدم ورود إجابة — ${directorate}`,
                    description: details,
                    date: now.slice(0, 10),
                    timestamp: now,
                    source: 'محضر المتابعة',
                    metadata: { timelineThreadKey: `executor_decision:${decisionId}` },
                });
            } catch {
                /* ignore */
            }
            setAwaitingUiById((prev) => ({
                ...prev,
                [decisionId]: {
                    noResponseFlow: undefined,
                    confirmingResend: false,
                    responseFormOpen: false,
                },
            }));
            setSaving(false);
            showToast('تم تسجيل عدم ورود الإجابة', 'success');
        },
        [
            applyCommunicationDecisionPatch,
            storageExecutionId,
            nextTimelineId,
            pushTimelineEvent,
            saving,
            setAwaitingUiById,
            setSaving,
            showToast,
        ],
    );

    const confirmResendLetter = useCallback(
        (decisionId: string, directorate: string) => {
            if (saving) return;
            if (!storageExecutionId || !decisionId) {
                showToast('تعذّر التسجيل — معرّف الإضبارة غير جاهز', 'error');
                return;
            }
            setSaving(true);
            const resendDate = getLocalTodayYmd();
            const patch = {
                deputationNoResponseConfirmed: false,
                deputationClosed: false,
                deputationSent: true,
                deputationReferralDate: undefined,
                date: resendDate,
            } as Record<string, unknown>;
            const ok = applyCommunicationDecisionPatch(decisionId, patch);
            if (!ok) {
                setSaving(false);
                showToast('تعذّر تأكيد الإرسال — أعد المحاولة أو افتح مركز القرارات.', 'error');
                return;
            }
            try {
                const now = new Date().toISOString();
                pushTimelineEvent({
                    id: nextTimelineId(),
                    type: 'communication',
                    title: `إعادة إرسال كتاب — ${directorate}`,
                    description: `تم تأكيد إرسال الكتاب مرة أخرى بتاريخ ${resendDate}`,
                    date: now.slice(0, 10),
                    timestamp: now,
                    source: 'محضر المتابعة',
                    metadata: { timelineThreadKey: `executor_decision:${decisionId}` },
                });
            } catch {
                /* ignore */
            }
            setAwaitingUiById((prev) => ({
                ...prev,
                [decisionId]: {
                    confirmingResend: false,
                    noResponseFlow: undefined,
                    responseFormOpen: false,
                },
            }));
            setSaving(false);
            showToast('تم تأكيد إرسال الكتاب — تابع نتيجة المخاطبة.', 'success');
        },
        [
            applyCommunicationDecisionPatch,
            storageExecutionId,
            nextTimelineId,
            pushTimelineEvent,
            saving,
            setAwaitingUiById,
            setSaving,
            showToast,
        ],
    );

    const markDelivered = useCallback(
        (decisionId: string) => {
            if (saving) return;
            if (!storageExecutionId || !decisionId) {
                showToast('تعذّر تسجيل التسليم — معرّف الإضبارة غير جاهز', 'error');
                return;
            }
            setSaving(true);
            const ok = applyCommunicationDecisionPatch(decisionId, { deputationSent: true });
            setSaving(false);
            if (!ok) {
                showToast('تعذّر تسجيل التسليم — أعد المحاولة أو افتح مركز القرارات.', 'error');
                return;
            }
            showToast('تم تسجيل التسليم', 'success');
        },
        [applyCommunicationDecisionPatch, storageExecutionId, saving, setSaving, showToast],
    );

    const saveInlineAccordionResult = useCallback(
        (decisionId: string, directorate: string, draft: CommunicationResultDraft) => {
            if (saving) return;
            if (!storageExecutionId || !decisionId) {
                showToast('تعذّر الحفظ — معرّف الإضبارة غير جاهز', 'error');
                return;
            }
            const validation = validateCommunicationResultDraft(draft);
            if (!validation.ok) {
                showToast(validation.message, 'warning');
                return;
            }
            setSaving(true);
            const now = new Date().toISOString();
            const ref = [String(draft.letterDate || '').trim(), String(draft.letterNum || '').trim()]
                .filter(Boolean)
                .join(' ');
            const patch = {
                deputationTargetDirectorate: String(draft.purpose || '').trim(),
                deputationReferralDate: ref || undefined,
                deputationResultDetails: String(draft.result || '').trim(),
                deputationClosed: true,
            } as Record<string, unknown>;
            const ok = applyCommunicationDecisionPatch(decisionId, patch);
            if (!ok) {
                setSaving(false);
                showToast('تعذّر حفظ النتيجة — أعد المحاولة أو افتح مركز القرارات.', 'error');
                return;
            }
            try {
                const refDisplay = [String(draft.letterDate || '').trim(), String(draft.letterNum || '').trim()]
                    .filter(Boolean)
                    .join(' · ');
                pushTimelineEvent({
                    id: nextTimelineId(),
                    type: 'communication',
                    title: `نتيجة مخاطبة — ${directorate}`,
                    description: [refDisplay ? `مرجع: ${refDisplay}` : '', String(draft.result || '').trim()]
                        .filter(Boolean)
                        .join('\n'),
                    date: now.slice(0, 10),
                    timestamp: now,
                    source: 'محضر المتابعة',
                    metadata: {
                        timelineThreadKey: `executor_decision:${decisionId}`,
                        decisionRowId: decisionId,
                    },
                });
            } catch {
                /* ignore */
            }
            setSaving(false);
            showToast('✅ تم حفظ النتيجة الواردة', 'success');
        },
        [
            applyCommunicationDecisionPatch,
            storageExecutionId,
            nextTimelineId,
            pushTimelineEvent,
            saving,
            setSaving,
            showToast,
        ],
    );

    return {
        saveCommunicationResult,
        dismissFollowup,
        confirmNoResponse,
        confirmResendLetter,
        markDelivered,
        saveInlineAccordionResult,
    };
}
