import type { Creditor, ExecutionFile, TimelineEvent } from '@/app/types/execution';
import type { PartyDeathSavePayload } from '@/app/components/lawyer/execution/PartyDeathReportModal';
import { hasOngoingAlimonyInExecution } from '@/app/components/lawyer/ExecutionCreationView/hooks/executionFormUtils';
import { buildExecutionMergeForCreditorPartyDeath } from '@/app/utils/creditorPartyDeathPersistence';
import {
    appendCreditorPartyDeathRequest,
    getCreditorHeirSubstitutionRequestStatus,
} from '@/app/utils/executorSeizureDecisionQueue';
import {
    buildDossierAutoFinishPatch,
    shouldAutoFinishDossierOnDeathReport,
} from '@/app/utils/partyDeathClaimPolicy';
import {
    buildScopedPartyDeathPersistPatch,
    getPartyDeathCaseForRole,
} from '@/app/utils/partyDeathCaseScope';
import type { PartyDeathSaveDeps } from './executionDashboardPartyDeathSave.types';
import { mergeHeirDetails, mergeHeirNames } from './partyDeathSaveHeirHelpers';

export function runCreditorPartyDeathSave(
    payload: PartyDeathSavePayload,
    deps: PartyDeathSaveDeps,
    base: ExecutionFile | null | undefined,
): boolean {
    const {
        creditors,
        debtors,
        claimType,
        decisionsStorageExecutionId,
        partyDeathModalDecisionId,
        nextTimelineId,
        persistExecutionMerge,
        patchExecutorDecisionRow,
        showToast,
        setTimelineEvents,
    } = deps;
                const creditorsList = [...(base?.creditors || creditors)];
                const debtorsSnapshot = [...(base?.debtors || debtors)];
                const nameSnapshot = String(creditorsList[0]?.name || '').trim();
                const heirNamesResolved =
                    payload.action === 'heir_substitution' || payload.action === 'seek_heir'
                        ? payload.heir_names.filter((s) => /\S/.test(String(s)))
                        : [];
                const heirDetailsResolved =
                    payload.action === 'heir_substitution' || payload.action === 'seek_heir'
                        ? (payload.heir_details || [])
                              .map((h) => ({
                                  name: String(h?.name || '').trim(),
                                  phone: String(h?.phone || '').trim(),
                                  address: String(h?.address || '').trim(),
                                  isClient: Boolean((h as { isClient?: boolean }).isClient),
                              }))
                              .filter((h) => /\S/.test(h.name))
                        : [];
                if (payload.action === 'death_only') {
                    if (hasOngoingAlimonyInExecution(base as Record<string, unknown>, claimType)) {
                        showToast(
                            'نفقة مستمرة — حدّد المستحق المتوفى من قائمة الدائن (نافذة مستحقي النفقة).',
                            'warning'
                        );
                        return false;
                    }
                    const autoFinishCreditor = shouldAutoFinishDossierOnDeathReport(
                        base as Record<string, unknown>,
                        claimType,
                        'creditor'
                    );
                    if (creditorsList[0]) {
                        creditorsList[0] = {
                            ...creditorsList[0],
                            type: 'creditor',
                            isDeceased: true,
                            heirs: [],
                            heirs_details: [],
                        } as Creditor;
                    }
                    const now = new Date().toISOString();
                    const te: TimelineEvent = {
                        id: nextTimelineId(),
                        date: now.slice(0, 10),
                        timestamp: now,
                        title: 'تسجيل الإبلاغ عن الوفاة',
                        description: `تم تسجيل الإبلاغ عن وفاة ${nameSnapshot || 'الدائن'} في الإضبارة.`,
                        type: 'procedure',
                        source: 'بطاقة الخصوم',
                    };
                    setTimelineEvents((prev) => {
                        const next = [te, ...prev];
                        persistExecutionMerge({
                            ...buildScopedPartyDeathPersistPatch(base, 'creditor', {
                                deceased_party: 'creditor',
                                heir_names: [],
                                heir_details: [],
                                flow: 'death_only',
                                heir_certificate_file_name: null,
                            }),
                            creditors: creditorsList,
                            debtors: debtorsSnapshot,
                            is_creditor_deceased: true,
                            deceased_creditor_legal_name_snapshot:
                                nameSnapshot || base?.deceased_creditor_legal_name_snapshot,
                            timelineEvents: next,
                            ...(autoFinishCreditor
                                ? buildDossierAutoFinishPatch('وفاة الدائن — إغلاق الإضبارة')
                                : {}),
                        });
                        return next;
                    });
                    showToast(
                        autoFinishCreditor
                            ? 'تم تسجيل وفاة الدائن وإغلاق الإضبارة.'
                            : 'تم تسجيل الإبلاغ عن وفاة الدائن.',
                        'success'
                    );
                    return true;
                }
                if (
                    payload.action === 'heir_substitution' &&
                    (getCreditorHeirSubstitutionRequestStatus(decisionsStorageExecutionId) === 'approved' ||
                        getCreditorHeirSubstitutionRequestStatus(decisionsStorageExecutionId) === 'alternative')
                ) {
                    const existingNames = (base?.creditors?.[0]?.heirs || []).filter((s) =>
                        /\S/.test(String(s))
                    );
                    const existingCaseNames = (
                        getPartyDeathCaseForRole(base, 'creditor')?.heir_names || []
                    ).filter((s) => /\S/.test(String(s)));
                    const mergedHeirNames = mergeHeirNames(
                        mergeHeirNames(existingNames, existingCaseNames),
                        heirNamesResolved
                    );
                    const existingDetails = Array.isArray(base?.creditors?.[0]?.heirs_details)
                        ? base.creditors[0].heirs_details
                        : [];
                    const creditorDeathCase = getPartyDeathCaseForRole(base, 'creditor');
                    const existingCaseDetails = Array.isArray(creditorDeathCase?.heir_details)
                        ? (creditorDeathCase.heir_details as Array<{
                              name?: string;
                              phone?: string;
                              address?: string;
                          }>)
                        : [];
                    const mergedHeirDetails = mergeHeirDetails(
                        mergeHeirDetails(existingDetails, existingCaseDetails),
                        heirDetailsResolved
                    );
                    const merge = buildExecutionMergeForCreditorPartyDeath(base, {
                        action: 'heir_substitution',
                        creditorNameSnapshot: nameSnapshot,
                        heir_names: mergedHeirNames,
                    });
                    const now = new Date().toISOString();
                    const te: TimelineEvent = {
                        id: nextTimelineId(),
                        date: now.slice(0, 10),
                        timestamp: now,
                        title: 'تثبيت إحلال ورثة الدائن',
                        description: `تم تثبيت إحلال ورثة الدائن في الإضبارة بعد موافقة المنفذ.\nأسماء الورثة: ${heirNamesResolved.join('، ') || '—'}`,
                        type: 'procedure',
                        source: 'بطاقة الخصوم',
                    };
                    setTimelineEvents((prev) => {
                        const next = [te, ...prev];
                        const mergeRec = merge as Record<string, unknown>;
                        const mergedCreditors = Array.isArray(mergeRec.creditors)
                            ? ([...(mergeRec.creditors as Creditor[])] as Creditor[])
                            : creditorsList;
                        if (mergedCreditors[0]) {
                            mergedCreditors[0] = {
                                ...mergedCreditors[0],
                                heirs: mergedHeirNames,
                                heirs_details: mergedHeirDetails,
                            } as Creditor;
                        }
                        persistExecutionMerge({
                            ...merge,
                            ...buildScopedPartyDeathPersistPatch(base, 'creditor', {
                                deceased_party: 'creditor',
                                heir_names: mergedHeirNames,
                                heir_details: mergedHeirDetails,
                                flow: 'heir_substitution',
                                heir_certificate_file_name: null,
                            }),
                            creditors: mergedCreditors,
                            timelineEvents: next,
                        });
                        return next;
                    });
                    showToast('تم تثبيت إحلال ورثة الدائن بعد موافقة المنفذ.', 'success');
                    if (partyDeathModalDecisionId) {
                        patchExecutorDecisionRow(decisionsStorageExecutionId, partyDeathModalDecisionId, {
                            heirSubstitutionCompletedAt: now,
                        });
                    }
                    return true;
                }
                const req = appendCreditorPartyDeathRequest({
                    executionId: decisionsStorageExecutionId,
                    action: payload.action,
                    creditorNameSnapshot: nameSnapshot,
                    heirNames: payload.action === 'no_heirs' ? [] : heirNamesResolved,
                });
                if (!req.ok) {
                    showToast(
                        'يوجد طلب بخصوص وفاة الدائن قيد البت لدى المنفذ. أكمل بتّه من «القرارات والطعون».',
                        'warning'
                    );
                    return false;
                }
                const now = new Date().toISOString();
                const teId = nextTimelineId();
                let teTitle = 'طلب — وفاة الدائن / إحلال الورثة';
                let teDesc = `أُحيل الطلب إلى «القرارات والطعون» بانتظار موافقة منفذ العدل أو رفض الطلب أو قرار بديل.\nالدائن: ${nameSnapshot || 'الدائن'}.`;
                if (payload.action === 'no_heirs') {
                    teTitle = 'طلب — وفاة الدائن دون ورثة وإغلاق الإضبارة';
                    teDesc = `قيد البت لدى المنفذ.\n${nameSnapshot || 'الدائن'}`;
                } else if (payload.action === 'seek_heir') {
                    teTitle = 'طلب — تسجيل وريث بعد مسار دون ورثة';
                    teDesc = `قيد البت لدى المنفذ.\nأسماء مقترحة: ${heirNamesResolved.join('، ') || '—'}`;
                } else if (payload.action === 'heir_substitution') {
                    teTitle = 'طلب — إحلال الورثة محل الدائن المتوفى';
                    teDesc = `قيد البت لدى المنفذ.\nأسماء الورثة المقترحة: ${heirNamesResolved.join('، ')}`;
                }
                const te: TimelineEvent = {
                    id: teId,
                    date: now.slice(0, 10),
                    timestamp: now,
                    title: teTitle,
                    description: teDesc,
                    type: 'decision',
                    source: 'بطاقة الخصوم',
                    metadata: req.decisionId
                        ? {
                              timelineThreadKey: `executor_decision:${req.decisionId}`,
                              decisionRowId: req.decisionId,
                          }
                        : undefined,
                };
                setTimelineEvents((prev) => {
                    const next = [te, ...prev];
                    persistExecutionMerge({ timelineEvents: next });
                    return next;
                });
                showToast('تم تقديم الطلب إلى «القرارات والطعون» بانتظار موافقة المنفذ.', 'success', {
                    decisionsLink: true,
                });
                return true;
    return false;
}
